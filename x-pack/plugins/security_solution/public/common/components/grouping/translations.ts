/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GROUPS_UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.grouping.total.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {group} other {groups}}`,
  });

export const TAKE_ACTION = i18n.translate(
  'xpack.securitySolution.grouping.additionalActions.takeAction',
  {
    defaultMessage: 'Take actions',
  }
);

export const BETA = i18n.translate('xpack.securitySolution.grouping.betaLabel', {
  defaultMessage: 'Beta',
});

export const BETA_TOOL_TIP = i18n.translate('xpack.securitySolution.grouping.betaToolTip', {
  defaultMessage:
    'Grouping may show only a subset of alerts while in beta. To see all alerts, use the list view by selecting "None"',
});

export const GROUP_BY = i18n.translate('xpack.securitySolution.selector.grouping.label', {
  defaultMessage: 'Group alerts by',
});

export const GROUP_BY_CUSTOM_FIELD = i18n.translate(
  'xpack.securitySolution.groupsSelector.customGroupByPanelTitle',
  {
    defaultMessage: 'Group By Custom Field',
  }
);

export const SELECT_FIELD = i18n.translate(
  'xpack.securitySolution.groupsSelector.groupByPanelTitle',
  {
    defaultMessage: 'Select Field',
  }
);

export const NONE = i18n.translate('xpack.securitySolution.groupsSelector.noneGroupByOptionName', {
  defaultMessage: 'None',
});

export const CUSTOM_FIELD = i18n.translate(
  'xpack.securitySolution.groupsSelector.customGroupByOptionName',
  {
    defaultMessage: 'Custom field',
  }
);
