/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INVESTIGATION_GUIDE = i18n.translate(
  'xpack.securitySolution.alertDetails.overview.investigationGuide',
  {
    defaultMessage: 'Investigation guide',
  }
);

export const TABLE = i18n.translate('xpack.securitySolution.eventDetails.table', {
  defaultMessage: 'Table',
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

export const DESCRIPTION = i18n.translate('xpack.securitySolution.eventDetails.description', {
  defaultMessage: 'Description',
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
