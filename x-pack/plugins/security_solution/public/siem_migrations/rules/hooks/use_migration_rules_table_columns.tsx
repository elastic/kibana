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

export const useMigrationRulesTableColumns = ({
  disableActions,
  openMigrationRuleDetails,
  installMigrationRule,
}: {
  disableActions?: boolean;
  openMigrationRuleDetails: (rule: RuleMigration) => void;
  installMigrationRule: (migrationRule: RuleMigration, enable?: boolean) => void;
}): TableColumn[] => {
  return useMemo(
    () => [
      createUpdatedColumn(),
      createNameColumn({ openMigrationRuleDetails }),
      createStatusColumn(),
      createRiskScoreColumn(),
      createSeverityColumn(),
      createActionsColumn({
        disableActions,
        openMigrationRuleDetails,
        installMigrationRule,
      }),
    ],
    [disableActions, installMigrationRule, openMigrationRuleDetails]
  );
};
