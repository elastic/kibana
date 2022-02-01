/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.pageTitle',
  {
    defaultMessage: 'Rule details',
  }
);

export const BACK_TO_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.backToRulesButton',
  {
    defaultMessage: 'Rules',
  }
);

export const EXPERIMENTAL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.experimentalDescription',
  {
    defaultMessage: 'Experimental',
  }
);

export const ACTIVATE_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.activateRuleLabel',
  {
    defaultMessage: 'Activate',
  }
);

export const UNKNOWN = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.unknownDescription',
  {
    defaultMessage: 'Unknown',
  }
);

export const RULE_EXECUTION_LOGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLogsTab',
  {
    defaultMessage: 'Rule execution logs ',
  }
);

export const SHOWING_EXECUTIONS = (totalItems: number) =>
  i18n.translate('xpack.securitySolution.ruleExecutionLog.totalExecutionsLabel', {
    values: { totalItems },
    defaultMessage:
      'Showing {totalItems} {totalItems, plural, =1 {rule execution} other {rule executions}}',
  });

export const RULE_EXECUTION_LOG_SEARCH_LIMIT_EXCEEDED = (totalItems: number) =>
  i18n.translate('xpack.securitySolution.ruleExecutionLog.searchLimitExceededLabel', {
    values: { totalItems },
    defaultMessage:
      "More than {totalItems} rule executions match filters provided. Showing first 500 by most recent '@timestamp'. Constrain filters further to view additional execution events",
  });

export const RULE_EXECUTION_LOG_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.searchPlaceholder',
  {
    defaultMessage: 'event.duration > 100 OR kibana.alert.rule.execution.metrics.total_hits > 100',
  }
);

export const COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.statusColumn',
  {
    defaultMessage: 'Status',
  }
);

export const COLUMN_TIMESTAMP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.timestampColumn',
  {
    defaultMessage: 'Timestamp',
  }
);

export const COLUMN_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.durationColumn',
  {
    defaultMessage: 'Duration (s)',
  }
);

export const COLUMN_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.messageColumn',
  {
    defaultMessage: 'Message',
  }
);

export const COLUMN_TOTAL_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.totalAlertsColumn',
  {
    defaultMessage: 'Total Alerts',
  }
);
export const COLUMN_TOTAL_HITS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.totalHitsColumn',
  {
    defaultMessage: 'Total Hits',
  }
);
export const COLUMN_GAP_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.gapDurationColumn',
  {
    defaultMessage: 'Gap Duration (s)',
  }
);

export const COLUMN_INDEX_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.indexDurationColumn',
  {
    defaultMessage: 'Index Duration (ms)',
  }
);

export const COLUMN_SEARCH_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.searchDurationColumn',
  {
    defaultMessage: 'Search Duration (ms)',
  }
);

export const TYPE_FAILED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.statusFailedDescription',
  {
    defaultMessage: 'Failed',
  }
);

export const EXCEPTIONS_TAB = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.exceptionsTab',
  {
    defaultMessage: 'Exceptions',
  }
);

export const DELETED_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.deletedRule',
  {
    defaultMessage: 'Deleted rule',
  }
);
