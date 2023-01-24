/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const Status = i18n.translate('xpack.securitySolution.alertCountByRuleByStatus.status', {
  defaultMessage: 'Status',
});

export const ALERTS_BY_RULE = i18n.translate(
  'xpack.securitySolution.alertCountByRuleByStatus.alertsByRule',
  {
    defaultMessage: 'Alerts by Rule',
  }
);
export const COLUMN_HEADER_RULE_NAME = i18n.translate(
  'xpack.securitySolution.alertCountByRuleByStatus.ruleName',
  {
    defaultMessage: 'kibana.alert.rule.name',
  }
);

export const COLUMN_HEADER_COUNT = i18n.translate(
  'xpack.securitySolution.alertCountByRuleByStatus.count',
  {
    defaultMessage: 'count',
  }
);

export const TOOLTIP_TITLE = i18n.translate(
  'xpack.securitySolution.alertCountByRuleByStatus.tooltipTitle',
  {
    defaultMessage: 'Rule name',
  }
);

export const NO_ALERTS_FOUND = i18n.translate(
  'xpack.securitySolution.alertCountByRuleByStatus.noRuleAlerts',
  {
    defaultMessage: 'No alerts to display',
  }
);
