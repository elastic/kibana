/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPDATE_ALL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.upgradeAll',
  {
    defaultMessage: 'Update all',
  }
);

export const UPDATE_SELECTED_RULES = (numberOfSelectedRules: number) => {
  return i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRules.upgradeSelected',
    {
      defaultMessage: 'Update {numberOfSelectedRules} selected rule(s)',
      values: { numberOfSelectedRules },
    }
  );
};

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.searchBarPlaceholder',
  {
    defaultMessage: 'Search by rule name',
  }
);

export const UPDATE_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.updateButtonLabel',
  {
    defaultMessage: 'Update',
  }
);
