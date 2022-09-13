/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TABLE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.tableTitle',
  {
    defaultMessage: 'Execution log',
  }
);

export const TABLE_SUBTITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.tableSubtitle',
  {
    defaultMessage: 'A log of rule execution results',
  }
);

export const SHOWING_EXECUTIONS = (totalItems: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.totalExecutionsLabel',
    {
      values: { totalItems },
      defaultMessage:
        'Showing {totalItems} {totalItems, plural, =1 {rule execution} other {rule executions}}',
    }
  );

export const RULE_EXECUTION_LOG_SEARCH_LIMIT_EXCEEDED = (totalItems: number, maxItems: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.searchLimitExceededLabel',
    {
      values: { totalItems, maxItems },
      defaultMessage:
        "More than {totalItems} rule executions match filters provided. Showing first {maxItems} by most recent '@timestamp'. Constrain filters further to view additional execution events.",
    }
  );

export const RULE_EXECUTION_LOG_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.searchPlaceholder',
  {
    defaultMessage: 'duration > 100 and gapDuration > 10',
  }
);

export const RULE_EXECUTION_LOG_SHOW_METRIC_COLUMNS_SWITCH = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.showMetricColumnsSwitchTitle',
  {
    defaultMessage: 'Show metrics columns',
  }
);

export const COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.statusColumn',
  {
    defaultMessage: 'Status',
  }
);

export const COLUMN_STATUS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.statusColumnTooltip',
  {
    defaultMessage: 'Overall status of execution.',
  }
);

export const COLUMN_TIMESTAMP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.timestampColumn',
  {
    defaultMessage: 'Timestamp',
  }
);

export const COLUMN_TIMESTAMP_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.timestampColumnTooltip',
  {
    defaultMessage: 'Datetime rule execution initiated.',
  }
);

export const COLUMN_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.durationColumn',
  {
    defaultMessage: 'Duration',
  }
);

export const COLUMN_DURATION_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.durationColumnTooltip',
  {
    defaultMessage: 'The length of time it took for the rule to run (hh:mm:ss:SSS).',
  }
);

export const COLUMN_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.messageColumn',
  {
    defaultMessage: 'Message',
  }
);

export const COLUMN_MESSAGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.messageColumnTooltip',
  {
    defaultMessage: 'Relevant message from execution outcome.',
  }
);

export const COLUMN_GAP_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.gapDurationColumn',
  {
    defaultMessage: 'Gap Duration',
  }
);

export const COLUMN_GAP_TOOLTIP_SEE_DOCUMENTATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.gapTooltipSeeDocsDescription',
  {
    defaultMessage: 'see documentation',
  }
);

export const COLUMN_INDEX_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.indexDurationColumn',
  {
    defaultMessage: 'Index Duration',
  }
);

export const COLUMN_INDEX_DURATION_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.indexDurationColumnTooltip',
  {
    defaultMessage: 'The length of time it took to index detected alerts (hh:mm:ss:SSS).',
  }
);

export const COLUMN_SEARCH_DURATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.searchDurationColumn',
  {
    defaultMessage: 'Search Duration',
  }
);

export const COLUMN_SEARCH_DURATION_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.searchDurationColumnTooltip',
  {
    defaultMessage: 'The length of time it took to search for alerts (hh:mm:ss:SSS).',
  }
);

export const COLUMN_SCHEDULING_DELAY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.schedulingDelayColumn',
  {
    defaultMessage: 'Scheduling Delay',
  }
);

export const COLUMN_SCHEDULING_DELAY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.schedulingDelayColumnTooltip',
  {
    defaultMessage: 'The length of time from rule scheduled till rule executed (hh:mm:ss:SSS).',
  }
);

export const COLUMN_ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.actionsColumn',
  {
    defaultMessage: 'Actions',
  }
);

export const COLUMN_ACTIONS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.actionsColumnTooltip',
  {
    defaultMessage: 'Filter alerts by rule execution ID.',
  }
);

export const ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.actionSearchFiltersUpdatedTitle',
  {
    defaultMessage: 'Global search filters have been updated',
  }
);

export const ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.actionSearchFiltersUpdatedDescription',
  {
    defaultMessage: 'Search filters have been updated to show alerts from selected rule execution',
  }
);

export const ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_RESTORE_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.actionSearchFiltersUpdatedRestoreButtonTitle',
  {
    defaultMessage: 'Restore previous filters',
  }
);

export const ACTIONS_FIELD_NOT_FOUND_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.actionFieldNotFoundErrorTitle',
  {
    defaultMessage: 'Unable to filter alerts',
  }
);

export const ACTIONS_FIELD_NOT_FOUND_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.actionFieldNotFoundErrorDescription',
  {
    defaultMessage: "Cannot find field 'kibana.alert.rule.execution.uuid' in alerts index.",
  }
);

export const DURATION_NOT_AVAILABLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.durationNotAvailableDescription',
  {
    defaultMessage: 'N/A',
  }
);

export const GREATER_THAN_YEAR = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionLog.durationGreaterThanYearDescription',
  {
    defaultMessage: '> 1 Year',
  }
);
