/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, Suspense, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { CaseSettingsConnector, SettingFieldsProps } from './types';
import { useCaseSettings } from './use_case_settings';
import { ConnectorTypeFields } from '../../../../../case/common/api/connectors';

interface Props extends Omit<SettingFieldsProps<ConnectorTypeFields['fields']>, 'connector'> {
  connector: CaseSettingsConnector | null;
}

const SettingFieldsFormComponent: React.FC<Props> = ({ connector, isEdit, onChange, fields }) => {
  const { caseSettingsRegistry } = useCaseSettings();
  const onFieldsChange = useCallback(
    (newFields) => {
      onChange(newFields);
    },
    [onChange]
  );

  if (connector == null || connector.actionTypeId == null || connector.actionTypeId === '.none') {
    return null;
  }

  const caseSetting = caseSettingsRegistry.get(connector.actionTypeId);
  const FieldsComponent = caseSetting.caseSettingFieldsComponent;

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
