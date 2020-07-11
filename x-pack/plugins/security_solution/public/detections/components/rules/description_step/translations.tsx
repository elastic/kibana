/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const FILTERS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.filtersLabel',
  {
    defaultMessage: 'Filters',
  }
);

export const QUERY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.QueryLabel',
  {
    defaultMessage: 'Custom query',
  }
);

export const SAVED_ID_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.savedIdLabel',
  {
    defaultMessage: 'Saved query name',
  }
);

export const ML_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.mlRuleTypeDescription',
  {
    defaultMessage: 'Machine Learning',
  }
);

export const QUERY_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.queryRuleTypeDescription',
  {
    defaultMessage: 'Query',
  }
);

export const THRESHOLD_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.thresholdRuleTypeDescription',
  {
    defaultMessage: 'Threshold',
  }
);

export const ML_JOB_STARTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.mlJobStartedDescription',
  {
    defaultMessage: 'Started',
  }
);

export const ML_JOB_STOPPED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.mlJobStoppedDescription',
  {
    defaultMessage: 'Stopped',
  }
);

export const THRESHOLD_RESULTS_ALL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.thresholdResultsAllDescription',
  {
    defaultMessage: 'All results',
  }
);

export const THRESHOLD_RESULTS_AGGREGATED_BY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.thresholdResultsAggregatedByDescription',
  {
    defaultMessage: 'Results aggregated by',
  }
);
