/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetFieldMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import type { AllowedFieldsForTermsQuery, GetAllowedFieldsForTermQuery } from './types';

const allowedFieldTypes = ['keyword', 'constant_keyword', 'wildcard', 'ip'];

// Return map of fields allowed for term query
export const getAllowedFieldForTermQueryFromMapping = (
  indexMapping: IndicesGetFieldMappingResponse
): { [key: string]: boolean } => {
  const result: { [key: string]: boolean } = {};
  const indicies = Object.values(indexMapping);
  indicies.forEach((index) => {
    Object.entries(index.mappings).forEach(([field, fieldValue]) => {
      Object.values(fieldValue.mapping).forEach((mapping) => {
        if (mapping?.type && allowedFieldTypes.includes(mapping?.type)) {
          result[field] = true;
        }
      });
    });
  });

  return result;
};

// Return map of fields allowed for term query for source and threat indices
export const getAllowedFieldsForTermQuery = async ({
  threatMatchedFields,
  services,
  threatIndex,
  inputIndex,
  ruleExecutionLogger,
}: GetAllowedFieldsForTermQuery): Promise<AllowedFieldsForTermsQuery> => {
  let allowedFieldsForTermsQuery = { source: {}, threat: {} };
  try {
    const sourceFieldsMapping =
      await services.scopedClusterClient.asCurrentUser.indices.getFieldMapping({
        index: inputIndex,
        fields: threatMatchedFields.source,
      });
    const threatFieldsMapping =
      await services.scopedClusterClient.asCurrentUser.indices.getFieldMapping({
        index: threatIndex,
        fields: threatMatchedFields.threat,
      });

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
