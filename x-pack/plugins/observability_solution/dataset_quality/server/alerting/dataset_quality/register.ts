/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import { DATASET_QUALITY_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import {
  DATASET_QUALITY_AAD_FIELDS,
  THRESHOLD_MET_GROUP,
} from '../../../common/alerting/constants';

import { getRuleExecutor } from './executor';

export const OBSERVABILITY_FEATURE_ID = 'observability';
export const DATASET_QUALITY_REGISTRATION_CONTEXT = 'observability.datasetQuality';
// export const oneOfLiterals = (arrayOfLiterals: Readonly<string[]>) =>
//   schema.string({
//     validate: (value) =>
//       arrayOfLiterals.includes(value) ? undefined : `must be one of ${arrayOfLiterals.join(' | ')}`,
//   });
// const comparators = Object.values(COMPARATORS);
const paramsSchema = schema.object({
  // threshold: schema.number(),
  // comparator: oneOfLiterals(comparators),
  // timeUnit: schema.string(),
  // timeSize: schema.number(),
});

export function datasetQualityRuleType() {
  return {
    id: DATASET_QUALITY_RULE_TYPE_ID,
    name: i18n.translate('xpack.datasetQuality.rules.datasetQualityRule.name', {
      defaultMessage: 'Dataset quality rule',
    }),
    // List of fields available in the alert document
    fieldsForAAD: DATASET_QUALITY_AAD_FIELDS,
    validate: {
      params: paramsSchema,
    },
    schemas: {
      params: {
        type: 'config-schema' as const,
        schema: paramsSchema,
      },
    },
    defaultActionGroupId: THRESHOLD_MET_GROUP.id,
    actionGroups: [THRESHOLD_MET_GROUP],
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: OBSERVABILITY_FEATURE_ID, // TODO: Update with app name
    minimumLicenseRequired: 'basic', // TODO: Update license
    isExportable: true,
    executor: getRuleExecutor(),
    doesSetRecoveryContext: true,
    actionVariables: {
      context: [{ name: 'reason', description: reasonActionVariableDescription }],
    },
    alerts: {
      context: DATASET_QUALITY_REGISTRATION_CONTEXT, // TODO: Double check
      mappings: { fieldMap: { ...legacyExperimentalFieldMap } },
      useEcs: false,
      useLegacyAlerts: true,
      shouldWrite: true,
    },
    // TODO: Add logic for creating view in app URL
    // getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
    //   observabilityPaths.ruleDetails(rule.id),
  };
}

export const reasonActionVariableDescription = i18n.translate(
  'xpack.datasetQuality.alerting.reasonDescription',
  {
    defaultMessage: 'A concise description of the reason for the alert',
  }
);
