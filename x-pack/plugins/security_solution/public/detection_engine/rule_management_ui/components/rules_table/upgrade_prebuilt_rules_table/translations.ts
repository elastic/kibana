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

export const BULK_UPDATE_BUTTON_TOOLTIP_NO_PERMISSIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.bulkButtons.noPermissions',
  {
    defaultMessage: "You don't have permissions to update rules",
  }
);

export const BULK_UPDATE_ALL_RULES_BUTTON_TOOLTIP_CONFLICTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.bulkButtons.allRules.conflicts',
  {
    defaultMessage: 'All rules have conflicts. Update them individually.',
  }
);

export const BULK_UPDATE_SELECTED_RULES_BUTTON_TOOLTIP_CONFLICTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.bulkButtons.selectedRules.conflicts',
  {
    defaultMessage: 'All selected rules have conflicts. Update them individually.',
  }
);

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
export const UPDATE_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.updateError',
  {
    defaultMessage: 'Update error',
  }
);

export const UPDATE_FLYOUT_PER_FIELD_TOOLTIP_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.perFieldTooltip',
  {
    defaultMessage: 'View changes field by field.',
  }
);

export const UPDATE_FLYOUT_JSON_VIEW_TOOLTIP_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.jsonViewTooltip',
  {
    defaultMessage: 'View the latest rule changes in JSON format.',
  }
);
