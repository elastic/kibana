/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, Suspense } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { CaseActionConnector } from '../types';
import { ConnectorFieldsProps } from './types';
import { getCaseConnectors } from '.';
import { ConnectorTypeFields } from '../../../common/api';

interface Props extends Omit<ConnectorFieldsProps<ConnectorTypeFields['fields']>, 'connector'> {
  connector: CaseActionConnector | null;
}

const ConnectorFieldsFormComponent: React.FC<Props> = ({ connector, isEdit, onChange, fields }) => {
  const { caseConnectorsRegistry } = getCaseConnectors();

  if (connector == null || connector.actionTypeId == null || connector.actionTypeId === '.none') {
    return null;
  }

  const { fieldsComponent: FieldsComponent } = caseConnectorsRegistry.get(connector.actionTypeId);

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
          <div data-test-subj={'connector-fields'}>
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
ConnectorFieldsFormComponent.displayName = 'ConnectorFieldsForm';

export const ConnectorFieldsForm = memo(ConnectorFieldsFormComponent);
