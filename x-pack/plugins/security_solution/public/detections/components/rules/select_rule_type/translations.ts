/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const QUERY_TYPE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.ruleTypeField.queryTypeTitle',
  {
    defaultMessage: 'Custom query',
  }
);

export const QUERY_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.ruleTypeField.queryTypeDescription',
  {
    defaultMessage: 'Use KQL or Lucene to detect issues across indices.',
  }
);

export const ML_TYPE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.ruleTypeField.mlTypeTitle',
  {
    defaultMessage: 'Machine Learning',
  }
);

export const ML_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.ruleTypeField.mlTypeDescription',
  {
    defaultMessage: 'Select ML job to detect anomalous activity.',
  }
);
