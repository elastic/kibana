/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, Suspense, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { Connector } from '../../../../..//case/common/api';
import { useCaseSettings } from './use_case_settings';

interface Props {
  connector: Connector;
}

const SettingFieldsFormComponent: React.FC<Props> = ({ connector }) => {
  const { caseSettingsRegistry } = useCaseSettings();
  const [fields, setFields] = useState({});

  if (connector == null) {
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
            fields={fields}
            connector={connector}
            onChange={(p, v) => setFields((prevFields) => ({ ...prevFields, [p]: v }))}
          />
        </Suspense>
      ) : null}
    </>
  );
};

export const SettingFieldsForm = memo(SettingFieldsFormComponent);
