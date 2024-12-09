/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlyoutResizable,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RuleMigrationTaskStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { DataInputStep } from './constants';
import { RulesDataInput } from './steps/rules/rules_data_input';
import { useStartMigration } from '../../service/hooks/use_start_migration';

export interface MigrationDataInputFlyoutProps {
  onClose: () => void;
  migrationStats?: RuleMigrationTaskStats;
}
export const MigrationDataInputFlyout = React.memo<MigrationDataInputFlyoutProps>(
  ({ onClose, migrationStats: initialMigrationSats }) => {
    const [migrationStats, setMigrationStats] = useState<RuleMigrationTaskStats | undefined>(
      initialMigrationSats
    );

    const { startMigration, isLoading: isStartLoading } = useStartMigration(onClose);
    const onStartMigration = useCallback(() => {
      if (migrationStats?.id) {
        startMigration(migrationStats.id);
      }
    }, [migrationStats, startMigration]);

    const [dataInputStep, setDataInputStep] = useState<DataInputStep>(() => {
      if (migrationStats) {
        return DataInputStep.macros;
      }
      return DataInputStep.rules;
    });

    const onMigrationCreated = useCallback(
      (createdMigrationStats: RuleMigrationTaskStats) => {
        if (createdMigrationStats) {
          setMigrationStats(createdMigrationStats);
          setDataInputStep(DataInputStep.macros);
        }
      },
      [setDataInputStep]
    );

    return (
      <EuiFlyoutResizable
        onClose={onClose}
        size="m"
        maxWidth={1200}
        minWidth={500}
        data-test-subj="uploadRulesFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.title"
                defaultMessage="Upload Splunk SIEM rules"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <RulesDataInput
            selected={dataInputStep === DataInputStep.rules}
            onMigrationCreated={onMigrationCreated}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={onClose}>
                <FormattedMessage
                  id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.closeButton"
                  defaultMessage="Close"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={onStartMigration}
                disabled={!migrationStats?.id}
                isLoading={isStartLoading}
              >
                <FormattedMessage
                  id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.translateButton"
                  defaultMessage="Translate"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyoutResizable>
    );
  }
);
MigrationDataInputFlyout.displayName = 'MigrationDataInputFlyout';
