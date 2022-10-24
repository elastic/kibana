/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

export const THREAT_QUERY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.threatQueryLabel',
  {
    defaultMessage: 'Indicator index query',
  }
);

export const SAVED_QUERY_NAME_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.savedIdLabel',
  {
    defaultMessage: 'Saved query name',
  }
);

export const SAVED_QUERY_FILTERS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.savedQueryFiltersLabel',
  {
    defaultMessage: 'Saved query filters',
  }
);

export const SAVED_QUERY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.savedQueryLabel',
  {
    defaultMessage: 'Saved query',
  }
);

export const ML_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.mlRuleTypeDescription',
  {
    defaultMessage: 'Machine Learning',
  }
);

export const EQL_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.eqlRuleTypeDescription',
  {
    defaultMessage: 'Event Correlation',
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

export const THREAT_MATCH_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.threatMatchRuleTypeDescription',
  {
    defaultMessage: 'Indicator Match',
  }
);

export const NEW_TERMS_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.newTermsRuleTypeDescription',
  {
    defaultMessage: 'New Terms',
  }
);

export const ML_RUN_JOB_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.mlRunJobLabel',
  {
    defaultMessage: 'Run job',
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

export const JOB_FAILED_STATUS_POPOVER_TITLE = (jobName: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.ruleDescription.mlFailedJobStatusPopoverTitle',
    {
      defaultMessage: '{jobName} failed to run',
      values: { jobName },
    }
  );

export const JOB_FAILED_STATUS_POPOVER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.mlFailedJobStatusPopoverTitle',
  {
    defaultMessage:
      'This ML job failed to run. Please go to Machine Learning to run this job before enabling this rule.',
  }
);

export const GO_TO_ML_PAGE_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.goToMlPageButtonLabel',
  {
    defaultMessage: 'Go to Machine Learning page',
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

export const EQL_EVENT_CATEGORY_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.eqlEventCategoryFieldLabel',
  {
    defaultMessage: 'Event category field',
  }
);

export const EQL_TIEBREAKER_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.eqlTiebreakerFieldLabel',
  {
    defaultMessage: 'Tiebreaker field',
  }
);

export const EQL_TIMESTAMP_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.eqlTimestampFieldLabel',
  {
    defaultMessage: 'Timestamp field',
  }
);
