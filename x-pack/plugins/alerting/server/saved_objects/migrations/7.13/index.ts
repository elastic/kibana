/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttribute } from '@kbn/core-saved-objects-server';
import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { RawRule } from '../../../types';
import { createEsoMigration, isSiemSignalsRuleType, pipeMigrations } from '../utils';

function convertNullToUndefined(attribute: SavedObjectAttribute) {
  return attribute != null ? attribute : undefined;
}

function removeNullsFromSecurityRules(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  const {
    attributes: { params },
  } = doc;
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      params: {
        ...params,
        buildingBlockType: convertNullToUndefined(params.buildingBlockType),
        note: convertNullToUndefined(params.note),
        index: convertNullToUndefined(params.index),
        language: convertNullToUndefined(params.language),
        license: convertNullToUndefined(params.license),
        outputIndex: convertNullToUndefined(params.outputIndex),
        savedId: convertNullToUndefined(params.savedId),
        timelineId: convertNullToUndefined(params.timelineId),
        timelineTitle: convertNullToUndefined(params.timelineTitle),
        meta: convertNullToUndefined(params.meta),
        query: convertNullToUndefined(params.query),
        filters: convertNullToUndefined(params.filters),
        riskScoreMapping: params.riskScoreMapping != null ? params.riskScoreMapping : [],
        ruleNameOverride: convertNullToUndefined(params.ruleNameOverride),
        severityMapping: params.severityMapping != null ? params.severityMapping : [],
        threat: params.threat != null ? params.threat : [],
        threshold:
          params.threshold != null &&
          typeof params.threshold === 'object' &&
          !Array.isArray(params.threshold)
            ? {
                field: Array.isArray(params.threshold.field)
                  ? params.threshold.field
                  : params.threshold.field === '' || params.threshold.field == null
                  ? []
                  : [params.threshold.field],
                value: params.threshold.value,
                cardinality:
                  params.threshold.cardinality != null ? params.threshold.cardinality : [],
              }
            : undefined,
        timestampOverride: convertNullToUndefined(params.timestampOverride),
        exceptionsList:
          params.exceptionsList != null
            ? params.exceptionsList
            : params.exceptions_list != null
            ? params.exceptions_list
            : params.lists != null
            ? params.lists
            : [],
        threatFilters: convertNullToUndefined(params.threatFilters),
        machineLearningJobId:
          params.machineLearningJobId == null
            ? undefined
            : Array.isArray(params.machineLearningJobId)
            ? params.machineLearningJobId
            : [params.machineLearningJobId],
      },
    },
  };
}

export const getMigrations7130 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawRule> => isSiemSignalsRuleType(doc),
    pipeMigrations(removeNullsFromSecurityRules)
  );
