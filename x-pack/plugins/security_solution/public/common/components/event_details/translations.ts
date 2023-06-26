/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const THREAT_INTEL = i18n.translate('xpack.securitySolution.alertDetails.threatIntel', {
  defaultMessage: 'Threat Intel',
});

export const INVESTIGATION_GUIDE = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.investigationGuide',
  {
    defaultMessage: 'Investigation guide',
  }
);

export const OVERVIEW = i18n.translate('xpack.securitySolution.alertDetails.overview', {
  defaultMessage: 'Overview',
});

export const HIGHLIGHTED_FIELDS = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.highlightedFields',
  {
    defaultMessage: 'Highlighted fields',
  }
);

export const HIGHLIGHTED_FIELDS_FIELD = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.highlightedFields.field',
  {
    defaultMessage: 'Field',
  }
);

export const HIGHLIGHTED_FIELDS_VALUE = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.highlightedFields.value',
  {
    defaultMessage: 'Value',
  }
);

export const HIGHLIGHTED_FIELDS_ALERT_PREVALENCE = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.highlightedFields.alertPrevalence',
  {
    defaultMessage: 'Alert prevalence',
  }
);

export const HIGHLIGHTED_FIELDS_ALERT_PREVALENCE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.highlightedFields.alertPrevalenceTooltip',
  {
    defaultMessage:
      'The total count of alerts with the same value within the currently selected timerange. This value is not affected by additional filters.',
  }
);

export const TABLE = i18n.translate('xpack.securitySolution.eventDetails.table', {
  defaultMessage: 'Table',
});

export const JSON_VIEW = i18n.translate('xpack.securitySolution.eventDetails.jsonView', {
  defaultMessage: 'JSON',
});

export const OSQUERY_VIEW = i18n.translate('xpack.securitySolution.eventDetails.osqueryView', {
  defaultMessage: 'Osquery Results',
});

export const RESPONSE_ACTIONS_VIEW = i18n.translate(
  'xpack.securitySolution.eventDetails.responseActionsView',
  {
    defaultMessage: 'Response Results',
  }
);

export const FIELD = i18n.translate('xpack.securitySolution.eventDetails.field', {
  defaultMessage: 'Field',
});

export const VALUE = i18n.translate('xpack.securitySolution.eventDetails.value', {
  defaultMessage: 'Value',
});

export const DESCRIPTION = i18n.translate('xpack.securitySolution.eventDetails.description', {
  defaultMessage: 'Description',
});

export const PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.eventDetails.filter.placeholder',
  {
    defaultMessage: 'Filter by Field, Value, or Description...',
  }
);

export const VIEW_COLUMN = (field: string) =>
  i18n.translate('xpack.securitySolution.eventDetails.viewColumnCheckboxAriaLabel', {
    values: { field },
    defaultMessage: 'View {field} column',
  });

export const NESTED_COLUMN = (field: string) =>
  i18n.translate('xpack.securitySolution.eventDetails.nestedColumnCheckboxAriaLabel', {
    values: { field },
    defaultMessage:
      'The {field} field is an object, and is broken down into nested fields which can be added as column',
  });

export const AGENT_STATUS = i18n.translate('xpack.securitySolution.detections.alerts.agentStatus', {
  defaultMessage: 'Agent status',
});

export const QUARANTINED_FILE_PATH = i18n.translate(
  'xpack.securitySolution.detections.alerts.quarantinedFilePath',
  {
    defaultMessage: 'Quarantined file path',
  }
);

export const RULE_TYPE = i18n.translate('xpack.securitySolution.detections.alerts.ruleType', {
  defaultMessage: 'Rule type',
});

export const MULTI_FIELD_TOOLTIP = i18n.translate(
  'xpack.securitySolution.eventDetails.multiFieldTooltipContent',
  {
    defaultMessage: 'Multi-fields can have multiple values per field',
  }
);

export const MULTI_FIELD_BADGE = i18n.translate(
  'xpack.securitySolution.eventDetails.multiFieldBadge',
  {
    defaultMessage: 'multi-field',
  }
);

export const ACTIONS = i18n.translate('xpack.securitySolution.eventDetails.table.actions', {
  defaultMessage: 'Actions',
});

export const ALERT_REASON = i18n.translate('xpack.securitySolution.eventDetails.alertReason', {
  defaultMessage: 'Alert reason',
});

export const VIEW_ALL_FIELDS = i18n.translate('xpack.securitySolution.eventDetails.viewAllFields', {
  defaultMessage: 'View all fields in table',
});

export const ENDPOINT_COMMANDS = Object.freeze({
  tried: (command: string) =>
    i18n.translate('xpack.securitySolution.eventDetails.responseActions.endpoint.tried', {
      values: { command },
      defaultMessage: 'tried to execute {command} command',
    }),
  executed: (command: string) =>
    i18n.translate('xpack.securitySolution.eventDetails.responseActions.endpoint.executed', {
      values: { command },
      defaultMessage: 'executed {command} command',
    }),
  pending: (command: string) =>
    i18n.translate('xpack.securitySolution.eventDetails.responseActions.endpoint.pending', {
      values: { command },
      defaultMessage: 'is executing {command} command',
    }),
  failed: (command: string) =>
    i18n.translate('xpack.securitySolution.eventDetails.responseActions.endpoint.failed', {
      values: { command },
      defaultMessage: 'failed to execute {command} command',
    }),
});

export const SUMMARY_VIEW = i18n.translate('xpack.securitySolution.eventDetails.summaryView', {
  defaultMessage: 'summary',
});

export const TIMELINE_VIEW = i18n.translate('xpack.securitySolution.eventDetails.timelineView', {
  defaultMessage: 'Timeline',
});

export const ALERT_SUMMARY_CONVERSATION_ID = i18n.translate(
  'xpack.securitySolution.alertSummaryView.alertSummaryViewConversationId',
  {
    defaultMessage: 'Alert summary',
  }
);

export const ALERT_SUMMARY_CONTEXT_DESCRIPTION = (view: string) =>
  i18n.translate('xpack.securitySolution.alertSummaryView.alertSummaryViewContextDescription', {
    defaultMessage: 'Alert (from {view})',
    values: { view },
  });

export const ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.alertSummaryView.alertSummaryViewContextTooltip',
  {
    defaultMessage: 'Add this alert as context',
  }
);

export const EVENT_SUMMARY_CONVERSATION_ID = i18n.translate(
  'xpack.securitySolution.alertSummaryView.eventSummaryViewConversationId',
  {
    defaultMessage: 'Event summary',
  }
);

export const EVENT_SUMMARY_CONTEXT_DESCRIPTION = (view: string) =>
  i18n.translate('xpack.securitySolution.alertSummaryView.eventSummaryViewContextDescription', {
    defaultMessage: 'Event (from {view})',
    values: { view },
  });

export const EVENT_SUMMARY_VIEW_CONTEXT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.alertSummaryView.eventSummaryViewContextTooltip',
  {
    defaultMessage: 'Add this event as context',
  }
);
