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

export const ALERT_SUPPRESSION_INSUFFICIENT_LICENSE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.alertSuppressionInsufficientLicense',
  {
    defaultMessage:
      'Alert suppression is configured but will not be applied due to insufficient licensing',
  }
);

export const ALERT_SUPPRESSION_TECHNICAL_PREVIEW = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.alertSuppressionTechnicalPreview',
  {
    defaultMessage: 'Technical Preview',
  }
);

export const THREAT_MARKER_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.threatMarkerRuleTypeDescription',
  {
    defaultMessage: 'Threat Marker',
  }
);
