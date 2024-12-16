/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty, EuiPanel } from '@elastic/eui';
import { PanelText } from '../../../../common/components/panel_text';
import { useStartMigration } from '../../service/hooks/use_start_migration';
import type { RuleMigrationStats } from '../../types';
import { useRuleMigrationDataInputContext } from '../data_input_flyout/context';
import * as i18n from './translations';

export interface MigrationReadyPanelProps {
  migrationStats: RuleMigrationStats;
}
export const MigrationReadyPanel = React.memo<MigrationReadyPanelProps>(({ migrationStats }) => {
  const { openFlyout } = useRuleMigrationDataInputContext();
  const onOpenFlyout = useCallback<React.MouseEventHandler>(() => {
    openFlyout(migrationStats);
  }, [openFlyout, migrationStats]);

  const { startMigration, isLoading } = useStartMigration();
  const onStartMigration = useCallback(() => {
    startMigration(migrationStats.id);
  }, [migrationStats.id, startMigration]);

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m">
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
            <EuiFlexItem grow={false}>
              <PanelText size="s" semiBold>
                <p>{i18n.RULE_MIGRATION_TITLE(migrationStats.number)}</p>
              </PanelText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <PanelText size="s" subdued>
                <p>{i18n.RULE_MIGRATION_READY_DESCRIPTION}</p>
              </PanelText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onStartMigration} isLoading={isLoading}>
            {i18n.RULE_MIGRATION_START_TRANSLATION_BUTTON}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="download" iconSide="right" onClick={onOpenFlyout}>
            {i18n.RULE_MIGRATION_UPLOAD_MACROS_BUTTON}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});
MigrationReadyPanel.displayName = 'MigrationReadyPanel';
