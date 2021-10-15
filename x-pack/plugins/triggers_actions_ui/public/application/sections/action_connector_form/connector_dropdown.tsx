/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { ActionConnector, ActionTypeIndex, AlertAction } from '../../../types';
import { getEnabledAndConfiguredConnectors } from '../common/connectors';
import { DeprecatedConnectorIcon } from './deprecated_connector';

export interface DropdownProps {
  actionItem: AlertAction;
  accordionIndex: number;
  actionTypesIndex: ActionTypeIndex;
  connectors: ActionConnector[];
  onConnectorSelected: (id: string) => void;
}

export const ConnectorsDropdown = React.memo(ConnectorsDropdownComponent);

function ConnectorsDropdownComponent({
  actionItem,
  accordionIndex,
  actionTypesIndex,
  connectors,
  onConnectorSelected,
}: DropdownProps) {
  const validConnectors = useMemo(
    () => getEnabledAndConfiguredConnectors(connectors, actionItem, actionTypesIndex),
    [actionItem, actionTypesIndex, connectors]
  );

  const valueOfSelected = useMemo(
    () => getValueOfSelectedConnector(actionItem.id, validConnectors),
    [actionItem.id, validConnectors]
  );

  const options = useMemo(() => createConnectorOptions(validConnectors), [validConnectors]);

  const onChange = useCallback((id: string) => onConnectorSelected(id), [onConnectorSelected]);

  return (
    <EuiSuperSelect
      aria-label={incidentManagemSystem}
      data-test-subj={`selectActionConnector-${actionItem.actionTypeId}-${accordionIndex}`}
      fullWidth
      options={options}
      onChange={onChange}
      valueOfSelected={valueOfSelected}
    />
  );
}

const getValueOfSelectedConnector = (
  actionItemId: string,
  connectors: ActionConnector[]
): string | undefined => {
  const selectedConnector = connectors.find((connector) => connector.id === actionItemId);

  if (!selectedConnector) {
    return;
  }

  return actionItemId;
};

const createConnectorOptions = (connectors: ActionConnector[]) =>
  connectors.map((connector) => {
    const title = `${connector.name} ${connector.isPreconfigured ? preconfiguredMessage : ''}`;

    return {
      value: connector.id,
      inputDisplay: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <span>{title}</span>
          </EuiFlexItem>
          <DeprecatedConnectorIcon connector={connector} />
        </EuiFlexGroup>
      ),
      'data-test-subj': `dropdown-connector-${connector.id}`,
    };
  });

const preconfiguredMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.preconfiguredTitleMessage',
  {
    defaultMessage: '(preconfigured)',
  }
);

const incidentManagemSystem = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.incidentManagementSystemLabel',
  {
    defaultMessage: 'Incident management system',
  }
);
