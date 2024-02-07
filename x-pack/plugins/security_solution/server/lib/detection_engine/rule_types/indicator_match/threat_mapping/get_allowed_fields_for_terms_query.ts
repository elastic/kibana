/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import type { AllowedFieldsForTermsQuery, GetAllowedFieldsForTermQuery } from './types';

const allowedFieldTypesSet = new Set(['keyword', 'constant_keyword', 'wildcard', 'ip']);

/*
 * Return map of fields allowed for term query
 */
export const getAllowedFieldForTermQueryFromMapping = (
  fieldsCapsResponse: FieldCapsResponse,
  fields: string[]
): Record<string, boolean> => {
  const fieldsCaps = fieldsCapsResponse.fields;

  const availableFields = fields.filter((field) => {
    const fieldCaps = fieldsCaps[field];

    const isAllVariationsAllowed = Object.values(fieldCaps).every((fieldCapByType) => {
      return allowedFieldTypesSet.has(fieldCapByType.type);
    });

    return isAllVariationsAllowed;
  });

  return availableFields.reduce<Record<string, boolean>>((acc, field) => {
    acc[field] = true;
    return acc;
  }, {});
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
      services.scopedClusterClient.asCurrentUser.fieldCaps({
        index: inputIndex,
        fields: threatMatchedFields.source,
      }),
      services.scopedClusterClient.asCurrentUser.fieldCaps({
        index: threatIndex,
        fields: threatMatchedFields.threat,
      }),
    ]);

    allowedFieldsForTermsQuery = {
      source: getAllowedFieldForTermQueryFromMapping(
        sourceFieldsMapping,
        threatMatchedFields.source
      ),
      threat: getAllowedFieldForTermQueryFromMapping(
        threatFieldsMapping,
        threatMatchedFields.threat
      ),
    };
  } catch (e) {
    ruleExecutionLogger.debug(`Can't get allowed fields for terms query: ${e}`);
    return allowedFieldsForTermsQuery;
  }

  return allowedFieldsForTermsQuery;
};
