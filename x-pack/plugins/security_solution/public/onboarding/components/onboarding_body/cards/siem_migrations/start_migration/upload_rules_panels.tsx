/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';
import type { RuleMigrationStats } from '../../../../../../siem_migrations/rules/types';
import { UploadRulesPanel } from './upload_rules_panel';

export interface UploadRulesPanelsProps {
  migrationsStats: RuleMigrationStats[];
}
export const UploadRulesPanels = React.memo<UploadRulesPanelsProps>(({ migrationsStats }) => {
  if (migrationsStats.length === 0) {
    return <UploadRulesPanel />;
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <UploadRulesPanel isUploadMore />
      </EuiFlexItem>
      {migrationsStats.map((migrationStats) => (
        <EuiFlexItem grow={false}>
          {migrationStats.status === SiemMigrationTaskStatus.RUNNING && (
            <RuleMigrationProcess migrationStats={migrationStats} />
          )}
          {migrationStats.status === SiemMigrationTaskStatus.FINISHED && (
            <RuleMigrationResult migrationStats={migrationStats} />
          )}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});
UploadRulesPanels.displayName = 'UploadRulesPanels';

const RuleMigrationProcess = () => null;
const RuleMigrationResult = () => null;
