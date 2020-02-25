/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexItem, EuiCard, EuiIcon, EuiFlexGrid } from '@elastic/eui';
import { ActionType, ActionTypeModel } from '../../../types';
import { useActionsConnectorsContext } from '../../context/actions_connectors_context';
import { TypeRegistry } from '../../type_registry';

interface Props {
  onActionTypeChange: (actionType: ActionType) => void;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
}

export const ActionTypeMenu = ({ onActionTypeChange, actionTypeRegistry }: Props) => {
  const { actionTypesIndex } = useActionsConnectorsContext();
  if (!actionTypesIndex) {
    return null;
  }

  const actionTypes = Object.entries(actionTypesIndex)
    .filter(([index]) => actionTypeRegistry.has(index))
    .map(([index, actionType]) => {
      const actionTypeModel = actionTypeRegistry.get(index);
      return {
        iconClass: actionTypeModel ? actionTypeModel.iconClass : '',
        selectMessage: actionTypeModel ? actionTypeModel.selectMessage : '',
        actionType,
        name: actionType.name,
        typeName: index.replace('.', ''),
      };
    });

  const cardNodes = actionTypes
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item, index) => {
      return (
        <EuiFlexItem key={index}>
          <EuiCard
            data-test-subj={`${item.actionType.id}-card`}
            icon={<EuiIcon size="xl" type={item.iconClass} />}
            title={item.name}
            description={item.selectMessage}
            onClick={() => onActionTypeChange(item.actionType)}
          />
        </EuiFlexItem>
      );
    });

  return <EuiFlexGrid columns={2}>{cardNodes}</EuiFlexGrid>;
};
