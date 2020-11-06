/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import { ILegacyScopedClusterClient, SavedObject, RequestHandlerContext } from 'src/core/server';
import { CoreSetup, Logger } from 'src/core/server';
import { BASE_API_URL } from '../../common';
import { IndexPatternAttributes, UI_SETTINGS } from '../../../../../src/plugins/data/server';

export function isBoomError(error: { isBoom?: boolean }): error is Boom {
  return error.isBoom === true;
}

/**
 * The number of docs to sample to determine field empty status.
 */
const SAMPLE_SIZE = 500;

export interface Field {
  name: string;
  isScript: boolean;
  isMeta: boolean;
  lang?: string;
  script?: string;
}

export async function existingFieldsRoute(setup: CoreSetup, logger: Logger) {
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
        logger.info(
          `Field existence check failed: ${isBoomError(e) ? e.output.payload.message : e.message}`
        );
        if (e.status === 404) {
          return res.notFound({ body: e.message });
        }
        if (isBoomError(e)) {
          if (e.output.statusCode === 404) {
            return res.notFound({ body: e.output.payload.message });
          }
          return res.internalError({ body: e.output.payload.message });
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
  const metaFields: string[] = await context.core.uiSettings.client.get(UI_SETTINGS.META_FIELDS);
  const { indexPattern, indexPatternTitle } = await fetchIndexPatternDefinition(
    indexPatternId,
    context
  );

  const fields = buildFieldList(indexPattern, metaFields);
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
  const indexPattern = await savedObjectsClient.get<IndexPatternAttributes>(
    'index-pattern',
    indexPatternId
  );
  const indexPatternTitle = indexPattern.attributes.title;

  return {
    indexPattern,
    indexPatternTitle,
  };
}

/**
 * Exported only for unit tests.
 */
export function buildFieldList(
  indexPattern: SavedObject<IndexPatternAttributes>,
  metaFields: string[]
): Field[] {
  return JSON.parse(indexPattern.attributes.fields).map(
    (field: { name: string; lang: string; scripted?: boolean; script?: string }) => {
      return {
        name: field.name,
        isScript: !!field.scripted,
        lang: field.lang,
        script: field.script,
        // id is a special case - it doesn't show up in the meta field list,
        // but as it's not part of source, it has to be handled separately.
        isMeta: metaFields.includes(field.name) || field.name === '_id',
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
      fields: ['*'],
      _source: false,
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

/**
 * Exported only for unit tests.
 */
export function existingFields(
  docs: Array<{ fields: Record<string, unknown[]>; [key: string]: unknown }>,
  fields: Field[]
): string[] {
  const missingFields = new Set(fields);

  for (const doc of docs) {
    if (missingFields.size === 0) {
      break;
    }

    missingFields.forEach((field) => {
      let fieldStore: Record<string, unknown> = doc.fields;
      if (field.isMeta) {
        fieldStore = doc;
      }
      const value = fieldStore[field.name];
      if (Array.isArray(value) && value.length) {
        missingFields.delete(field);
      } else if (!Array.isArray(value) && value) {
        missingFields.delete(field);
      }
    });
  }

  return fields.filter((field) => !missingFields.has(field)).map((f) => f.name);
}
