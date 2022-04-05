/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CUSTOM_QUERY_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customQueryFieldRequiredError',
  {
    defaultMessage: 'A custom query is required.',
  }
);

export const EQL_QUERY_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.eqlQueryFieldRequiredError',
  {
    defaultMessage: 'An EQL query is required.',
  }
);

export const INVALID_CUSTOM_QUERY = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customQueryFieldInvalidError',
  {
    defaultMessage: 'The KQL is invalid',
  }
);

export const INDEX_HELPER_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.indicesHelperDescription',
  {
    defaultMessage:
      'Enter the pattern of Elasticsearch indices where you would like this rule to run. By default, these will include index patterns defined in Security Solution advanced settings.',
  }
);

export const RESET_DEFAULT_INDEX = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.resetDefaultIndicesButton',
  {
    defaultMessage: 'Reset to default index patterns',
  }
);

export const IMPORT_TIMELINE_QUERY = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.importTimelineQueryButton',
  {
    defaultMessage: 'Import query from saved timeline',
  }
);

export const ML_JOB_SELECT_PLACEHOLDER_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.mlJobSelectPlaceholderText',
  {
    defaultMessage: 'Select a job',
  }
);

export const QUERY_BAR_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldQuerBarLabel',
  {
    defaultMessage: 'Custom query',
  }
);

export const EQL_QUERY_BAR_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.EqlQueryBarLabel',
  {
    defaultMessage: 'EQL query',
  }
);

export const THREAT_MATCH_INDEX_HELPER_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.threatMatchingIcesHelperDescription',
  {
    defaultMessage: 'Select threat indices',
  }
);

export const THREAT_MATCH_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customThreatQueryFieldRequiredError',
  {
    defaultMessage: 'At least one indicator match is required.',
  }
);

export const THREAT_MATCH_EMPTIES = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customThreatQueryFieldRequiredEmptyError',
  {
    defaultMessage: 'All matches require both a field and threat index field.',
  }
);

export const INDEX_PATTERNS = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.indexPatternDropdown',
  {
    defaultMessage: 'Index Patterns',
  }
);
