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
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { DataInputStep } from './constants';
import { RulesDataInput } from './steps/rules/rules_data_input';

export interface MigrationDataInputFlyoutProps {
  onClose: () => void;
  migrationId?: string;
  dataInputStep?: DataInputStep;
}
export const MigrationDataInputFlyout = React.memo<MigrationDataInputFlyoutProps>(
  ({
    onClose,
    migrationId: initialMigrationId,
    dataInputStep: initialDataInputStep = DataInputStep.rules,
  }) => {
    const { siemMigrations } = useKibana().services;
    const [migrationId, setMigrationId] = useState<string | undefined>(initialMigrationId);

    const onStart = useCallback(() => {
      if (migrationId) {
        siemMigrations.rules.startRuleMigration(migrationId);
        onClose();
      }
    }, [migrationId, siemMigrations.rules, onClose]);

    const [dataInputStep, setDataInputStep] = useState<DataInputStep>(() => {
      if (initialMigrationId && initialDataInputStep === DataInputStep.rules) {
        return DataInputStep.macros; // if initialMigrationId is defined the rules step is not available anymore.
      }
      return initialDataInputStep;
    });

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
          <RulesDataInput />
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
              <EuiButton fill onClick={onStart} disabled={!migrationId}>
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
