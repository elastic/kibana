/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useGetMigrationRulesQuery } from '../api/hooks/use_get_migration_rules_query';
import * as i18n from './translations';

export const useGetMigrationRules = (migrationId: string) => {
  const { addError } = useAppToasts();

  return useGetMigrationRulesQuery(migrationId, {
    onError: (error) => {
      addError(error, { title: i18n.GET_MIGRATION_RULES_FAILURE });
    },
  });
};
