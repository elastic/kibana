/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SecurityPageName,
  SECURITY_FEATURE_ID,
  SIEM_MIGRATIONS_RULES_PATH,
} from '../../common/constants';
import { SIEM_MIGRATIONS_RULES } from '../app/translations';
import type { LinkItem } from '../common/links/types';
import { SiemMigrationsIcon } from '../common/icons/siem_migrations';

export const siemMigrationsLinks: LinkItem = {
  id: SecurityPageName.siemMigrationsRules,
  title: SIEM_MIGRATIONS_RULES,
  description: i18n.translate('xpack.securitySolution.appLinks.siemMigrationsRulesDescription', {
    defaultMessage: 'SIEM Rules Migrations.',
  }),
  landingIcon: SiemMigrationsIcon,
  path: SIEM_MIGRATIONS_RULES_PATH,
  capabilities: [`${SECURITY_FEATURE_ID}.show`],
  skipUrlState: true,
  hideTimeline: true,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.siemMigrationsRules', {
      defaultMessage: 'SIEM Rules Migrations',
    }),
  ],
  experimentalKey: 'siemMigrationsEnabled',
};
