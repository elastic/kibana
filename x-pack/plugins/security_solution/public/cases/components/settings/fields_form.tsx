/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, Suspense, useState, useCallback, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { CaseSettingsConnector } from './types';
import { useCaseSettings } from './use_case_settings';

interface Props {
  connector: CaseSettingsConnector | null;
  onFieldsChange: (fields: Record<string, unknown>) => void;
}

const SettingFieldsFormComponent: React.FC<Props> = ({ connector, onFieldsChange }) => {
  const { caseSettingsRegistry } = useCaseSettings();
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const onChange = useCallback((p, v) => setFields((prevFields) => ({ ...prevFields, [p]: v })), [
    setFields,
  ]);

  useEffect(() => onFieldsChange(fields), [fields, onFieldsChange]);

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
          <FieldsComponent fields={fields} connector={connector} onChange={onChange} />
        </Suspense>
      ) : null}
    </>
  );
};

export const SettingFieldsForm = memo(SettingFieldsFormComponent);
