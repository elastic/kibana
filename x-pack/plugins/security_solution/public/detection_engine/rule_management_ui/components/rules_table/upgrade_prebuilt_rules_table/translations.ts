/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPGRADE_ALL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.upgradeAll',
  {
    defaultMessage: 'Upgrade all',
  }
);

export const UPGRADE_SELECTED_RULES = (numberOfSelectedRules: number) => {
  return i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRules.upgradeSelected',
    {
      defaultMessage: 'Upgrade {numberOfSelectedRules} selected rule(s)',
      values: { numberOfSelectedRules },
    }
  );
};
