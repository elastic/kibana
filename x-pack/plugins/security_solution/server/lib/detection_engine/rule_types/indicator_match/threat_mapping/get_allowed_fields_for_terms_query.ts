/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetFieldMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import type { AllowedFieldsForTermsQuery, GetAllowedFieldsForTermQuery } from './types';

const allowedFieldTypes = ['keyword', 'constant_keyword', 'wildcard', 'ip'];

/*
 * Return map of fields allowed for term query
 */
export const getAllowedFieldForTermQueryFromMapping = (
  indexMapping: IndicesGetFieldMappingResponse
): Record<string, boolean> => {
  const result: Record<string, boolean> = {};
  const notAllowedFields: string[] = [];

  const indices = Object.values(indexMapping);
  indices.forEach((index) => {
    Object.entries(index.mappings).forEach(([field, fieldValue]) => {
      Object.values(fieldValue.mapping).forEach((mapping) => {
        const fieldType = mapping?.type;
        if (!fieldType) return;

        if (allowedFieldTypes.includes(fieldType) && !notAllowedFields.includes(field)) {
          result[field] = true;
        } else {
          notAllowedFields.push(field);
          // if we the field allowed in one index, but not allowed in another, we should delete it from result
          delete result[field];
        }
      });
    });
  });

  return result;
};

/**
 * Return map of fields allowed for term query for source and threat indices
 */
export const getAllowedFieldsForTermQuery = async ({
  threatMatchedFields,
  services,
  threatIndex,
  inputIndex,
  ruleExecutionLogger,
}: GetAllowedFieldsForTermQuery): Promise<AllowedFieldsForTermsQuery> => {
  let allowedFieldsForTermsQuery = { source: {}, threat: {} };
  try {
    const [sourceFieldsMapping, threatFieldsMapping] = await Promise.all([
      services.scopedClusterClient.asCurrentUser.indices.getFieldMapping({
        index: inputIndex,
        fields: threatMatchedFields.source,
      }),
      services.scopedClusterClient.asCurrentUser.indices.getFieldMapping({
        index: threatIndex,
        fields: threatMatchedFields.threat,
      }),
    ]);

    allowedFieldsForTermsQuery = {
      source: getAllowedFieldForTermQueryFromMapping(sourceFieldsMapping),
      threat: getAllowedFieldForTermQueryFromMapping(threatFieldsMapping),
    };
  } catch (e) {
    ruleExecutionLogger.debug(`Can't get allowed fields for terms query: ${e}`);
    return allowedFieldsForTermsQuery;
  }

  return allowedFieldsForTermsQuery;
};
