/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, Suspense, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { CaseSettingsConnector, SettingFieldsProps } from './types';
import { getCaseSettings } from '.';
import { ConnectorTypeFields } from '../../../../../case/common/api/connectors';

interface Props extends Omit<SettingFieldsProps<ConnectorTypeFields['fields']>, 'connector'> {
  connector: CaseSettingsConnector | null;
}

const SettingFieldsFormComponent: React.FC<Props> = ({ connector, isEdit, onChange, fields }) => {
  const { caseSettingsRegistry } = getCaseSettings();

  const onFieldsChange = useCallback(
    (newFields) => {
      onChange(newFields);
    },
    [onChange]
  );

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
          <FieldsComponent
            isEdit={isEdit}
            fields={fields}
            connector={connector}
            onChange={onFieldsChange}
          />
        </Suspense>
      ) : null}
    </>
  );
};

export const SettingFieldsForm = memo(SettingFieldsFormComponent);
