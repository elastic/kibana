/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EQL_TYPE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.ruleTypeField.eqlTypeTitle',
  {
    defaultMessage: 'Event Correlation',
  }
);

export const EQL_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.ruleTypeField.eqlTypeDescription',
  {
    defaultMessage:
      'Use Event Query Language (EQL) to match events, generate sequences, and stack data',
  }
);

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

export const THRESHOLD_TYPE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.ruleTypeField.thresholdTypeTitle',
  {
    defaultMessage: 'Threshold',
  }
);

export const THRESHOLD_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.ruleTypeField.thresholdTypeDescription',
  {
    defaultMessage: 'Aggregate query results to detect when number of matches exceeds threshold.',
  }
);

export const THREAT_MATCH_TYPE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.ruleTypeField.threatMatchTitle',
  {
    defaultMessage: 'Indicator Match',
  }
);

export const THREAT_MATCH_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.ruleTypeField.threatMatchDescription',
  {
    defaultMessage:
      'Use indicators from intelligence sources to detect matching events and alerts.',
  }
);
