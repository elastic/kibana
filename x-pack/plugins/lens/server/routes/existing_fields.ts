/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import { ILegacyScopedClusterClient, SavedObject, RequestHandlerContext } from 'src/core/server';
import { CoreSetup } from 'src/core/server';
import { BASE_API_URL } from '../../common';
import {
  IndexPatternsFetcher,
  IndexPatternAttributes,
} from '../../../../../src/plugins/data/server';

/**
 * The number of docs to sample to determine field empty status.
 */
const SAMPLE_SIZE = 500;

interface MappingResult {
  [indexPatternTitle: string]: {
    mappings: {
      properties: Record<string, { type: string; path: string }>;
    };
  };
}

interface FieldDescriptor {
  name: string;
  subType?: { multi?: { parent?: string } };
}

export interface Field {
  name: string;
  isScript: boolean;
  isAlias: boolean;
  path: string[];
  lang?: string;
  script?: string;
}

const metaFields = ['_source', '_type'];

export async function existingFieldsRoute(setup: CoreSetup) {
  const router = setup.http.createRouter();

  router.post(
    {
      path: `${BASE_API_URL}/existing_fields/{indexPatternId}`,
      validate: {
        params: schema.object({
          indexPatternId: schema.string(),
        }),
        body: schema.object({
          dslQuery: schema.object({}, { unknowns: 'allow' }),
          fromDate: schema.maybe(schema.string()),
          toDate: schema.maybe(schema.string()),
          timeFieldName: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, req, res) => {
      try {
        return res.ok({
          body: await fetchFieldExistence({
            ...req.params,
            ...req.body,
            context,
          }),
        });
      } catch (e) {
        if (e.status === 404) {
          return res.notFound();
        }
        if (e.isBoom) {
          if (e.output.statusCode === 404) {
            return res.notFound();
          }
          return res.internalError(e.output.message);
        } else {
          return res.internalError({
            body: Boom.internal(e.message || e.name),
          });
        }
      }
    }
  );
}

async function fetchFieldExistence({
  context,
  indexPatternId,
  dslQuery = { match_all: {} },
  fromDate,
  toDate,
  timeFieldName,
}: {
  indexPatternId: string;
  context: RequestHandlerContext;
  dslQuery: object;
  fromDate?: string;
  toDate?: string;
  timeFieldName?: string;
}) {
  const {
    indexPattern,
    indexPatternTitle,
    mappings,
    fieldDescriptors,
  } = await fetchIndexPatternDefinition(indexPatternId, context);

  const fields = buildFieldList(indexPattern, mappings, fieldDescriptors);
  const docs = await fetchIndexPatternStats({
    fromDate,
    toDate,
    dslQuery,
    client: context.core.elasticsearch.legacy.client,
    index: indexPatternTitle,
    timeFieldName: timeFieldName || indexPattern.attributes.timeFieldName,
    fields,
  });

  return {
    indexPatternTitle,
    existingFieldNames: existingFields(docs, fields),
  };
}

async function fetchIndexPatternDefinition(indexPatternId: string, context: RequestHandlerContext) {
  const savedObjectsClient = context.core.savedObjects.client;
  const requestClient = context.core.elasticsearch.legacy.client;
  const indexPattern = await savedObjectsClient.get<IndexPatternAttributes>(
    'index-pattern',
    indexPatternId
  );
  const indexPatternTitle = indexPattern.attributes.title;

  if (indexPatternTitle.includes(':')) {
    // Cross cluster search patterns include a colon, and we aren't able to fetch
    // mapping information.
    return {
      indexPattern,
      indexPatternTitle,
      mappings: {},
      fieldDescriptors: [],
    };
  }

  // TODO: maybe don't use IndexPatternsFetcher at all, since we're only using it
  // to look up field values in the resulting documents. We can accomplish the same
  // using the mappings which we're also fetching here.
  const indexPatternsFetcher = new IndexPatternsFetcher(requestClient.callAsCurrentUser);
  const [mappings, fieldDescriptors] = await Promise.all([
    requestClient.callAsCurrentUser('indices.getMapping', {
      index: indexPatternTitle,
    }),

    indexPatternsFetcher.getFieldsForWildcard({
      pattern: indexPatternTitle,
      // TODO: Pull this from kibana advanced settings
      metaFields,
    }),
  ]);

  return {
    indexPattern,
    indexPatternTitle,
    mappings,
    fieldDescriptors,
  };
}

/**
 * Exported only for unit tests.
 */
export function buildFieldList(
  indexPattern: SavedObject<IndexPatternAttributes>,
  mappings: MappingResult | {},
  fieldDescriptors: FieldDescriptor[]
): Field[] {
  const aliasMap = Object.entries(Object.values(mappings)[0]?.mappings.properties ?? {})
    .map(([name, v]) => ({ ...v, name }))
    .filter((f) => f.type === 'alias')
    .reduce((acc, f) => {
      acc[f.name] = f.path;
      return acc;
    }, {} as Record<string, string>);

  const descriptorMap = fieldDescriptors.reduce((acc, f) => {
    acc[f.name] = f;
    return acc;
  }, {} as Record<string, FieldDescriptor>);

  return JSON.parse(indexPattern.attributes.fields).map(
    (field: { name: string; lang: string; scripted?: boolean; script?: string }) => {
      const path =
        aliasMap[field.name] || descriptorMap[field.name]?.subType?.multi?.parent || field.name;
      return {
        name: field.name,
        isScript: !!field.scripted,
        isAlias: !!aliasMap[field.name],
        path: path.split('.'),
        lang: field.lang,
        script: field.script,
      };
    }
  );
}

async function fetchIndexPatternStats({
  client,
  index,
  dslQuery,
  timeFieldName,
  fromDate,
  toDate,
  fields,
}: {
  client: ILegacyScopedClusterClient;
  index: string;
  dslQuery: object;
  timeFieldName?: string;
  fromDate?: string;
  toDate?: string;
  fields: Field[];
}) {
  const filter =
    timeFieldName && fromDate && toDate
      ? [
          {
            range: {
              [timeFieldName]: {
                gte: fromDate,
                lte: toDate,
              },
            },
          },
          dslQuery,
        ]
      : [dslQuery];

  const query = {
    bool: {
      filter,
    },
  };

  const scriptedFields = fields.filter((f) => f.isScript);
  const result = await client.callAsCurrentUser('search', {
    index,
    body: {
      size: SAMPLE_SIZE,
      query,
      sort: timeFieldName && fromDate && toDate ? [{ [timeFieldName]: 'desc' }] : [],
      // _source is required because we are also providing script fields.
      _source: '*',
      script_fields: scriptedFields.reduce((acc, field) => {
        acc[field.name] = {
          script: {
            lang: field.lang,
            source: field.script,
          },
        };
        return acc;
      }, {} as Record<string, unknown>),
    },
  });
  return result.hits.hits;
}

// Recursive function to determine if the _source of a document
// contains a known path.
function exists(obj: unknown, path: string[], i = 0): boolean {
  if (obj == null) {
    return false;
  }

  if (path.length === i) {
    return true;
  }

  if (Array.isArray(obj)) {
    return obj.some((child) => exists(child, path, i));
  }

  if (typeof obj === 'object') {
    // Because Elasticsearch flattens paths, dots in the field name are allowed
    // as JSON keys. For example, { 'a.b': 10 }
    const partialKeyMatches = Object.getOwnPropertyNames(obj)
      .map((key) => key.split('.'))
      .filter((keyPaths) => keyPaths.every((key, keyIndex) => key === path[keyIndex + i]));

    if (partialKeyMatches.length) {
      return partialKeyMatches.every((keyPaths) => {
        return exists(
          (obj as Record<string, unknown>)[keyPaths.join('.')],
          path,
          i + keyPaths.length
        );
      });
    }

    return exists((obj as Record<string, unknown>)[path[i]], path, i + 1);
  }

  return path.length === i;
}

/**
 * Exported only for unit tests.
 */
export function existingFields(
  docs: Array<{ _source: unknown; fields: unknown }>,
  fields: Field[]
): string[] {
  const missingFields = new Set(fields);

  for (const doc of docs) {
    if (missingFields.size === 0) {
      break;
    }

    missingFields.forEach((field) => {
      if (exists(field.isScript ? doc.fields : doc._source, field.path)) {
        missingFields.delete(field);
      }
    });
  }

  return fields.filter((field) => !missingFields.has(field)).map((f) => f.name);
}
