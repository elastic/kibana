/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { ActionConnector, ActionTypeIndex, ActionTypeModel, AlertAction } from '../../../types';
import { getValidConnectors } from '../common/connectors';
import { preconfiguredMessage } from '../../../common/connectors_selection';

interface DropdownProps {
  actionItem: AlertAction;
  accordionIndex: number;
  actionTypesIndex: ActionTypeIndex;
  actionTypeRegistered: ActionTypeModel;
  connectors: ActionConnector[];
  onConnectorSelected: (id: string) => void;
}

export const ConnectorsDropdown = React.memo(ConnectorsDropdownComponent);

function ConnectorsDropdownComponent({
  actionItem,
  accordionIndex,
  actionTypesIndex,
  actionTypeRegistered,
  connectors,
  onConnectorSelected,
}: DropdownProps) {
  const validConnectors = useMemo(
    () => getValidConnectors(connectors, actionItem, actionTypesIndex),
    [actionItem, actionTypesIndex, connectors]
  );

  const valueOfSelected = useMemo(
    () => getValueOfSelectedConnector(actionItem.id, validConnectors),
    [actionItem.id, validConnectors]
  );

  const options = useMemo(
    () => createConnectorOptions(validConnectors, actionTypeRegistered),
    [validConnectors, actionTypeRegistered]
  );

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

const createConnectorOptions = (
  connectors: ActionConnector[],
  actionTypeRegistered: ActionTypeModel
) =>
  connectors.map((connector) => {
    const title = getTitle(connector);

    const ConnectorRow = () =>
      actionTypeRegistered.actionConnectorDropdownComponent != null ? (
        <actionTypeRegistered.actionConnectorDropdownComponent actionConnector={connector} />
      ) : (
        <EuiFlexItem grow={false}>
          <span>{title}</span>
        </EuiFlexItem>
      );

    return {
      value: connector.id,
      inputDisplay: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <ConnectorRow />
        </EuiFlexGroup>
      ),
      'data-test-subj': `dropdown-connector-${connector.id}`,
    };
  });

const getTitle = (connector: ActionConnector) => {
  let title = connector.name;

  if (connector.isPreconfigured) {
    title += ` ${preconfiguredMessage}`;
  }

  return title;
};

const incidentManagemSystem = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.incidentManagementSystemLabel',
  {
    defaultMessage: 'Incident management system',
  }
);
