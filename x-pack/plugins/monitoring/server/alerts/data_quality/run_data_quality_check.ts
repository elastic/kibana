/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import has from 'lodash/has';
import type { GetUnallowedFieldValuesInputs } from './types';
import { fetchMappings } from './fetch_mappings';
import { getFieldsWithTypes as mappingToFieldTypes } from './field_types';
import { getUnallowedFieldValues } from './get_unallowed';
import { extendFieldsWithAllowedValues } from './extend_fields_with_allowed_values';
import { checkMappings, FieldWithInvalidType } from './check_mappings';

interface InvalidFieldsSummary {
  key: string;
  doc_count: number;
}

export const runDataQualityCheck = async (
  es: ElasticsearchClient,
  indexPatterns: string[],
  from: string,
  to: string
) => {
  const mappingRequestResult = await fetchMappings(es, indexPatterns);

  const inputs: GetUnallowedFieldValuesInputs = [];

  const unallowedValuesCheckResults: Array<[index: string, invalidFields: InvalidFieldsSummary[]]> =
    [];

  const mappingsCheckResults: FieldWithInvalidType[] = [];

  for (const indexName in mappingRequestResult) {
    if (has(mappingRequestResult, indexName)) {
      const {
        [indexName]: {
          mappings: { properties },
        },
      } = mappingRequestResult;

      mappingsCheckResults.push(...checkMappings(mappingRequestResult, indexName));

      const fieldsTypes = mappingToFieldTypes(properties as Record<string, unknown>);

      const fieldsWithAllowedValuesSpecified = extendFieldsWithAllowedValues(fieldsTypes);

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

  (responses as any[]).forEach(({ aggregations: { unallowedValues }, indexName }) => {
    if (!unallowedValues) {
      return;
    }

    const { buckets: values } = unallowedValues;

    if (!values.length) {
      return;
    }

    unallowedValuesCheckResults.push([indexName, values as InvalidFieldsSummary[]]);
  });

  return { unallowedValuesCheckResults, mappingsCheckResults };
};
