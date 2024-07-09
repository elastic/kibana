/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  ActionConnector,
  ActionConnectorMode,
  ActionTypeRegistryContract,
} from '@kbn/alerts-ui-shared';
import { RuleActionParam } from '@kbn/alerting-types';

interface NotificationPolicyActionParamsOpts {
  index: number;
  connector: ActionConnector;
  connectorParams: Record<string, RuleActionParam>;
  connectorTypeRegistry: ActionTypeRegistryContract;
  setConnectorParamsProperty: (key: string, value: RuleActionParam, connectorId: string) => void;
}

export const NotificationPolicyActionParams = ({
  index,
  connector,
  connectorParams,
  connectorTypeRegistry,
  setConnectorParamsProperty,
}: NotificationPolicyActionParamsOpts) => {
  const connectorType = connectorTypeRegistry.get(connector.actionTypeId);
  const defaultActionParams = connectorType.defaultActionParams;
  const ParamsFieldsComponent = connectorType.actionParamsFields;

  const onEditAction = (key: string, value: RuleActionParam, i: number) => {
    setConnectorParamsProperty(key, value, connector.id);
  };
  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem style={{ maxWidth: '700px' }}>
          <ParamsFieldsComponent
            actionConnector={connector}
            actionParams={connectorParams ?? defaultActionParams ?? {}}
            errors={{}}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
            editAction={onEditAction}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { NotificationPolicyActionParams as default };
