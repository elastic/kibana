/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const migrationAliasMessage = (legacyIds: string[], newIds: string[]) =>
  i18n.translate('xpack.security_solution.signals_migrations.aliasMessage', {
    defaultMessage: `The following migrations were found by the specified IDs: [{legacyList}], but they should instead be referenced by their newer IDs: [{newList}]. Please submit the request again.`,
    values: {
      legacyList: legacyIds.join(),
      newList: newIds.join(),
    },
  });

export const migrationConflictMessage = (legacyIds: string[], newIds: string[]) =>
  i18n.translate('xpack.security_solution.signals_migration.conflictMessage', {
    defaultMessage: `The following migrations were found by the specified IDs: [{legacyList}], but other saved objects were found to have legacy aliases that conflict with these IDs: [{newList}]. Please resolve these conflicts and submit the request again.`,
    values: {
      legacyList: legacyIds.join(),
      newList: newIds.join(),
    },
  });
