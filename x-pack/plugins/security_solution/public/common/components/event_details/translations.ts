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

export const FIELD = i18n.translate('xpack.securitySolution.eventDetails.field', {
  defaultMessage: 'Field',
});

export const VALUE = i18n.translate('xpack.securitySolution.eventDetails.value', {
  defaultMessage: 'Value',
});

export const DESCRIPTION = i18n.translate('xpack.securitySolution.eventDetails.description', {
  defaultMessage: 'Description',
});

export const BLANK = i18n.translate('xpack.securitySolution.eventDetails.blank', {
  defaultMessage: ' ',
});

export const PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.eventDetails.filter.placeholder',
  {
    defaultMessage: 'Filter by Field, Value, or Description...',
  }
);

export const COPY_TO_CLIPBOARD = i18n.translate(
  'xpack.securitySolution.eventDetails.copyToClipboard',
  {
    defaultMessage: 'Copy to Clipboard',
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

export const RULE_TYPE = i18n.translate('xpack.securitySolution.detections.alerts.ruleType', {
  defaultMessage: 'Rule type',
});

export const SOURCE_EVENT_ID = i18n.translate(
  'xpack.securitySolution.detections.alerts.sourceEventId',
  {
    defaultMessage: 'Source event id',
  }
);

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

export const REASON = i18n.translate('xpack.securitySolution.eventDetails.reason', {
  defaultMessage: 'Reason',
});

export const VIEW_RULE_DETAIL_PAGE = i18n.translate(
  'xpack.securitySolution.eventDetails.viewRuleDetailPage',
  {
    defaultMessage: 'View Rule detail page',
  }
);

export const VIEW_ALL_FIELDS = i18n.translate('xpack.securitySolution.eventDetails.viewAllFields', {
  defaultMessage: 'View all fields in table',
});
