/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, Suspense } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { CaseSettingsConnector, SettingFieldsProps } from './types';
import { getCaseSettings } from '.';
import { ConnectorTypeFields } from '../../../../../case/common/api/connectors';

interface Props extends Omit<SettingFieldsProps<ConnectorTypeFields['fields']>, 'connector'> {
  connector: CaseSettingsConnector | null;
}

const SettingFieldsFormComponent: React.FC<Props> = ({ connector, isEdit, onChange, fields }) => {
  const { caseSettingsRegistry } = getCaseSettings();

  if (connector == null || connector.actionTypeId == null || connector.actionTypeId === '.none') {
    return null;
  }

  const { caseSettingFieldsComponent: FieldsComponent } = caseSettingsRegistry.get(
    connector.actionTypeId
  );

  return (
    <>
      {FieldsComponent != null ? (
        <Suspense
          fallback={
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <div data-test-subj={'connector-settings'}>
            <FieldsComponent
              isEdit={isEdit}
              fields={fields}
              connector={connector}
              onChange={onChange}
            />
          </div>
        </Suspense>
      ) : null}
    </>
  );
};

export const SettingFieldsForm = memo(SettingFieldsFormComponent);
