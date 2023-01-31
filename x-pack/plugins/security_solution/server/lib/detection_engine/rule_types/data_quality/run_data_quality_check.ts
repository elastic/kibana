/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import has from 'lodash/has';
import { EcsFlat } from '@kbn/ecs';
import type { GetUnallowedFieldValuesInputs } from './types';
import { fetchMappings } from './fetch_mappings';
import { getFieldTypes } from './field_types';
import { getUnallowedFieldValues } from './create_data_quality_alert_type';

interface InvalidFieldsSummary {
  key: string;
  doc_count: number;
}

export type UnallowedFieldCheckResults = Array<[string, InvalidFieldsSummary[]]>;
export const runDataQualityCheck = async (
  es: ElasticsearchClient,
  indexPatterns: string[],
  from: string,
  to: string
) => {
  /*
      TODO check schema types types like that
       isEcsCompliant: type === ecsMetadata[field].type && indexInvalidValues.length === 0
      */

  const mappingRequestResult = await fetchMappings(es, indexPatterns);

  const inputs: GetUnallowedFieldValuesInputs = [];

  for (const indexName in mappingRequestResult) {
    if (has(mappingRequestResult, indexName)) {
      const {
        [indexName]: {
          mappings: { properties },
        },
      } = mappingRequestResult;

      const fields = getFieldTypes(properties as Record<string, unknown>);

      const fieldsWithAllowedValuesSpecified = fields
        .map((field) => ({
          ...field,
          allowedValues: (EcsFlat as Record<string, { allowed_values?: unknown[] }>)[field.field]
            ?.allowed_values,
        }))
        .filter((field) => field.allowedValues);

      inputs.push(
        ...(fieldsWithAllowedValuesSpecified.map((field) => ({
          indexName,
          allowedValues: field.allowedValues,
          indexFieldName: field.field,
          from,
          to,
        })) as GetUnallowedFieldValuesInputs)
      );
    }
  }

  const { responses } = await getUnallowedFieldValues(es, inputs);

  const results: UnallowedFieldCheckResults = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (responses as any[]).forEach(({ aggregations: { unallowedValues }, indexName }) => {
    if (!unallowedValues) {
      return;
    }

    const { buckets: values } = unallowedValues;

    if (!values.length) {
      return;
    }

    results.push([indexName, values as InvalidFieldsSummary[]]);
  });

  return results;
};
