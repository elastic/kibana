/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { ActionConnector, ActionTypeIndex, ActionTypeModel, RuleAction } from '../../../types';
import { getValidConnectors } from '../common/connectors';

interface ConnectorOption {
  title: string;
  id: string;
  prependComponent?: JSX.Element;
}

interface SelectionProps {
  actionItem: RuleAction;
  accordionIndex: number;
  actionTypesIndex: ActionTypeIndex;
  actionTypeRegistered: ActionTypeModel;
  connectors: ActionConnector[];
  onConnectorSelected: (id: string) => void;
}

export const ConnectorsSelection = React.memo(ConnectorsSelectionComponent);

function ConnectorsSelectionComponent({
  actionItem,
  accordionIndex,
  actionTypesIndex,
  actionTypeRegistered,
  connectors,
  onConnectorSelected,
}: SelectionProps) {
  const validConnectors = useMemo(
    () => getValidConnectors(connectors, actionItem, actionTypesIndex),
    [actionItem, actionTypesIndex, connectors]
  );

  const selectedConnectors = useMemo(
    () => getValueOfSelectedConnector(actionItem.id, validConnectors, actionTypeRegistered),
    [actionItem.id, validConnectors, actionTypeRegistered]
  );

  const options = useMemo(
    () => createConnectorOptions(validConnectors, actionTypeRegistered),
    [validConnectors, actionTypeRegistered]
  );

  const [selectedOption, setSelectedOption] = useState<
    EuiComboBoxOptionOption<ConnectorOption> | undefined
  >(selectedConnectors.length > 0 ? selectedConnectors[0] : undefined);

  const onChange = useCallback(
    (connectorOptions: Array<EuiComboBoxOptionOption<ConnectorOption>>) => {
      setSelectedOption(connectorOptions[0]);
      onConnectorSelected(connectorOptions[0].value?.id ?? '');
    },
    [onConnectorSelected]
  );

  return (
    <EuiComboBox
      aria-label={incidentManagemSystem}
      data-test-subj={`selectActionConnector-${actionItem.actionTypeId}-${accordionIndex}`}
      fullWidth
      singleSelection={{ asPlainText: true }}
      id={`selectActionConnector-${actionItem.id}`}
      isClearable={false}
      onChange={onChange}
      options={options}
      selectedOptions={selectedConnectors}
      prepend={selectedOption?.value?.prependComponent}
    />
  );
}

const getValueOfSelectedConnector = (
  actionItemId: string,
  connectors: ActionConnector[],
  actionTypeRegistered: ActionTypeModel
): Array<EuiComboBoxOptionOption<ConnectorOption>> => {
  const selectedConnector = connectors.find((connector) => connector.id === actionItemId);

  if (!selectedConnector) {
    return [];
  }

  return [createOption(selectedConnector, actionTypeRegistered)];
};

const createConnectorOptions = (
  connectors: ActionConnector[],
  actionTypeRegistered: ActionTypeModel
): Array<EuiComboBoxOptionOption<ConnectorOption>> =>
  connectors.map((connector) => createOption(connector, actionTypeRegistered));

const createOption = (connector: ActionConnector, actionTypeRegistered: ActionTypeModel) => {
  const title = getTitle(connector, actionTypeRegistered);

  let prependComponent: JSX.Element | undefined;

  if (actionTypeRegistered.customConnectorSelectItem != null) {
    const CustomPrependComponent =
      actionTypeRegistered.customConnectorSelectItem.getComponent(connector);
    if (CustomPrependComponent) {
      prependComponent = <CustomPrependComponent actionConnector={connector} />;
    }
  }

  return {
    label: title,
    value: {
      title,
      id: connector.id,
      prependComponent,
    },
    key: connector.id,
    'data-test-subj': `dropdown-connector-${connector.id}`,
  };
};

const getTitle = (connector: ActionConnector, actionTypeRegistered: ActionTypeModel) => {
  if (actionTypeRegistered.customConnectorSelectItem != null) {
    return actionTypeRegistered.customConnectorSelectItem.getText(connector);
  }

  return connector.name;
};

const incidentManagemSystem = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.incidentManagementSystemLabel',
  {
    defaultMessage: 'Incident management system',
  }
);
