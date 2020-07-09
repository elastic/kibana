/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const STACK_BY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.stackByLabel',
  {
    defaultMessage: 'Stack by',
  }
);

export const STACK_BY_RISK_SCORES = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.riskScoresDropDown',
  {
    defaultMessage: 'Risk scores',
  }
);

export const STACK_BY_SEVERITIES = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.severitiesDropDown',
  {
    defaultMessage: 'Severities',
  }
);

export const STACK_BY_DESTINATION_IPS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.destinationIpsDropDown',
  {
    defaultMessage: 'Top destination IPs',
  }
);

export const STACK_BY_SOURCE_IPS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.sourceIpsDropDown',
  {
    defaultMessage: 'Top source IPs',
  }
);

export const STACK_BY_ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.eventActionsDropDown',
  {
    defaultMessage: 'Top event actions',
  }
);

export const STACK_BY_CATEGORIES = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.eventCategoriesDropDown',
  {
    defaultMessage: 'Top event categories',
  }
);

export const STACK_BY_HOST_NAMES = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.hostNamesDropDown',
  {
    defaultMessage: 'Top host names',
  }
);

export const STACK_BY_RULE_TYPES = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.ruleTypesDropDown',
  {
    defaultMessage: 'Top rule types',
  }
);

export const STACK_BY_RULE_NAMES = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.rulesDropDown',
  {
    defaultMessage: 'Top rules',
  }
);

export const STACK_BY_USERS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.usersDropDown',
  {
    defaultMessage: 'Top users',
  }
);

export const TOP = (fieldName: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.alerts.histogram.topNLabel', {
    values: { fieldName },
    defaultMessage: `Top {fieldName}`,
  });

export const HISTOGRAM_HEADER = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.headerTitle',
  {
    defaultMessage: 'Trend',
  }
);

export const ALL_OTHERS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.allOthersGroupingLabel',
  {
    defaultMessage: 'All others',
  }
);

export const VIEW_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.viewAlertsButtonLabel',
  {
    defaultMessage: 'View alerts',
  }
);

export const SHOWING_ALERTS = (
  totalAlertsFormatted: string,
  totalAlerts: number,
  modifier: string
) =>
  i18n.translate('xpack.securitySolution.detectionEngine.alerts.histogram.showingAlertsTitle', {
    values: { totalAlertsFormatted, totalAlerts, modifier },
    defaultMessage:
      'Showing: {modifier}{totalAlertsFormatted} {totalAlerts, plural, =1 {alert} other {alerts}}',
  });
