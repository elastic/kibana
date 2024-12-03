/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RuleMigration } from '../../../../common/siem_migrations/model/rule_migration.gen';
import type { TableColumn } from '../components/rules_table_columns';
import {
  createActionsColumn,
  createNameColumn,
  createRiskScoreColumn,
  createSeverityColumn,
  createStatusColumn,
  createUpdatedColumn,
} from '../components/rules_table_columns';

export const useRulesTableColumns = ({
  disableActions,
  openMigrationRulePreview,
  installMigrationRule,
}: {
  disableActions?: boolean;
  openMigrationRulePreview: (rule: RuleMigration) => void;
  installMigrationRule: (migrationRule: RuleMigration, enable?: boolean) => void;
}): TableColumn[] => {
  return useMemo(
    () => [
      createUpdatedColumn(),
      createNameColumn({ openMigrationRulePreview }),
      createStatusColumn(),
      createRiskScoreColumn(),
      createSeverityColumn(),
      createActionsColumn({
        disableActions,
        openMigrationRulePreview,
        installMigrationRule,
      }),
    ],
    [disableActions, installMigrationRule, openMigrationRulePreview]
  );
};
