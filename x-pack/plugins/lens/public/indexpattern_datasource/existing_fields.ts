/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RuntimeField } from '@kbn/data-views-plugin/common';
import { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { IUiSettingsClient } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

/**
 * The number of docs to sample to determine field empty status.
 */
const SAMPLE_SIZE = 500;

export interface Field {
  name: string;
  isScript: boolean;
  isMeta: boolean;
  lang?: estypes.ScriptLanguage;
  script?: string;
  runtimeField?: RuntimeField;
}

export async function fetchFieldExistence({
  dataView,
  dataService,
  dataViewsService,
  uiSettingsClient,
  dslQuery = { match_all: {} },
  fromDate,
  toDate,
  timeFieldName,
  includeFrozen,
  useSampling,
}: {
  dataView: DataView;
  dataService: DataPublicPluginStart;
  dataViewsService: DataViewsPublicPluginStart;
  uiSettingsClient: IUiSettingsClient;
  dslQuery: object;
  fromDate?: string;
  toDate?: string;
  timeFieldName?: string;
  includeFrozen: boolean;
  useSampling: boolean;
}) {
  if (useSampling) {
    return legacyFetchFieldExistenceSampling({
      dataView,
      dataService,
      uiSettingsClient,
      dslQuery,
      fromDate,
      toDate,
      timeFieldName,
      includeFrozen,
    });
  }
  const metaFields: string[] = await uiSettingsClient.get(UI_SETTINGS.META_FIELDS);
  const allFields = buildFieldList(dataView, metaFields);
  const filter = toQuery(timeFieldName, fromDate, toDate, dslQuery);
  const existingFieldList = await dataViewsService.getFieldsForIndexPattern(dataView, {
    // filled in by data views service
    pattern: '',
    filter,
  });

  return {
    indexPatternTitle: dataView.title,
    existingFieldNames: existingFields(existingFieldList, allFields),
  };
}

async function legacyFetchFieldExistenceSampling({
  dataView,
  dataService,
  dslQuery,
  fromDate,
  toDate,
  timeFieldName,
  includeFrozen,
  uiSettingsClient,
}: {
  dataView: DataView;
  dataService: DataPublicPluginStart;
  uiSettingsClient: IUiSettingsClient;
  dslQuery: object;
  fromDate?: string;
  toDate?: string;
  timeFieldName?: string;
  includeFrozen: boolean;
}) {
  const metaFields: string[] = await uiSettingsClient.get(UI_SETTINGS.META_FIELDS);

  const fields = buildFieldList(dataView, metaFields);
  const runtimeMappings = dataView.getRuntimeMappings();

  const docs = await fetchIndexPatternStats({
    fromDate,
    data: dataService,
    toDate,
    dslQuery,
    index: dataView.title,
    timeFieldName: timeFieldName || dataView.timeFieldName,
    fields,
    runtimeMappings,
    includeFrozen,
  });

  return {
    indexPatternTitle: dataView.title,
    existingFieldNames: legacyExistingFields(docs, fields),
  };
}

/**
 * Exported only for unit tests.
 */
export function buildFieldList(indexPattern: DataView, metaFields: string[]): Field[] {
  return indexPattern.fields.map((field) => {
    return {
      name: field.name,
      isScript: !!field.scripted,
      lang: field.lang,
      script: field.script,
      // id is a special case - it doesn't show up in the meta field list,
      // but as it's not part of source, it has to be handled separately.
      isMeta: metaFields.includes(field.name) || field.name === '_id',
      runtimeField: !field.isMapped ? field.runtimeField : undefined,
    };
  });
}

async function fetchIndexPatternStats({
  data,
  index,
  dslQuery,
  timeFieldName,
  fromDate,
  toDate,
  fields,
  runtimeMappings,
  includeFrozen,
}: {
  data: DataPublicPluginStart;
  index: string;
  dslQuery: object;
  timeFieldName?: string;
  fromDate?: string;
  toDate?: string;
  fields: Field[];
  runtimeMappings: estypes.MappingRuntimeFields;
  includeFrozen: boolean;
}) {
  const query = toQuery(timeFieldName, fromDate, toDate, dslQuery);

  const scriptedFields = fields.filter((f) => f.isScript);
  const result = await data.search
    .search(
      {
        params: {
          index,
          ...(includeFrozen ? { ignore_throttled: false } : {}),
          body: {
            size: SAMPLE_SIZE,
            query,
            // Sorted queries are usually able to skip entire shards that don't match
            sort: timeFieldName && fromDate && toDate ? [{ [timeFieldName]: 'desc' }] : [],
            fields: ['*'],
            _source: false,
            runtime_mappings: runtimeMappings,
            script_fields: scriptedFields.reduce((acc, field) => {
              acc[field.name] = {
                script: {
                  lang: field.lang!,
                  source: field.script!,
                },
              };
              return acc;
            }, {} as Record<string, estypes.ScriptField>),
            // Small improvement because there is overhead in counting
            track_total_hits: false,
            // Per-shard timeout, must be lower than overall. Shards return partial results on timeout
            timeout: '4500ms',
          },
        },
      },
      {
        // Global request timeout. Will cancel the request if exceeded. Overrides the elasticsearch.requestTimeout
        // requestTimeout: '5000ms',
        // Fails fast instead of retrying- default is to retry
        // maxRetries: 0,
      }
    )
    .toPromise();
  // @ts-ignore
  return result?.hits?.hits;
}

function toQuery(
  timeFieldName: string | undefined,
  fromDate: string | undefined,
  toDate: string | undefined,
  dslQuery: object
) {
  const filter =
    timeFieldName && fromDate && toDate
      ? [
          {
            range: {
              [timeFieldName]: {
                format: 'strict_date_optional_time',
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
  return query;
}

/**
 * Exported only for unit tests.
 */
export function existingFields(filteredFields: FieldSpec[], allFields: Field[]): string[] {
  const filteredFieldsSet = new Set(filteredFields.map((f) => f.name));
  return allFields
    .filter((field) => field.isScript || field.runtimeField || filteredFieldsSet.has(field.name))
    .map((f) => f.name);
}

/**
 * Exported only for unit tests.
 */
export function legacyExistingFields(docs: estypes.SearchHit[], fields: Field[]): string[] {
  const missingFields = new Set(fields);

  for (const doc of docs) {
    if (missingFields.size === 0) {
      break;
    }

    missingFields.forEach((field) => {
      let fieldStore = doc.fields!;
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
