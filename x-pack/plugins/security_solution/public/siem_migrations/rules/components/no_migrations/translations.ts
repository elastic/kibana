/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_MIGRATIONS_AVAILABLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.noMigrationsTitle',
  {
    defaultMessage: 'No migrations',
  }
);

export const NO_MIGRATIONS_AVAILABLE_BODY = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.noMigrationsBodyTitle',
  {
    defaultMessage: 'There are no migrations available',
  }
);

export const GO_BACK_TO_RULES_TABLE_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.table.goToMigrationsPageButton',
  {
    defaultMessage: 'Go back to SIEM Migrations',
  }
);
