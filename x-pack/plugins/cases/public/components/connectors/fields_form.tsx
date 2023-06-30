/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, Suspense } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText } from '@elastic/eui';

import type { CaseActionConnector } from '../types';
import { getCaseConnectors } from '.';

interface Props {
  connector: CaseActionConnector | null;
}

const ConnectorFieldsFormComponent: React.FC<Props> = ({ connector }) => {
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
              <EuiFlexItem>
                <EuiSkeletonText lines={5} size="m" />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <div data-test-subj={'connector-fields'}>
            <FieldsComponent connector={connector} key={connector.id} />
          </div>
        </Suspense>
      ) : null}
    </>
  );
};
ConnectorFieldsFormComponent.displayName = 'ConnectorFieldsForm';

export const ConnectorFieldsForm = memo(ConnectorFieldsFormComponent);
