/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { EuiFlexItem, EuiCard, EuiIcon, EuiFlexGrid } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionType, ActionTypeIndex } from '../../../types';
import { loadActionTypes } from '../../lib/action_connector_api';
import { useActionsConnectorsContext } from '../../context/actions_connectors_context';

interface Props {
  onActionTypeChange: (actionType: ActionType) => void;
  actionTypes?: ActionType[];
}

export const ActionTypeMenu = ({ onActionTypeChange, actionTypes }: Props) => {
  const { http, toastNotifications, actionTypeRegistry } = useActionsConnectorsContext();
  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const availableActionTypes = actionTypes ?? (await loadActionTypes({ http }));
        const index: ActionTypeIndex = {};
        for (const actionTypeItem of availableActionTypes) {
          index[actionTypeItem.id] = actionTypeItem;
        }
        setActionTypesIndex(index);
      } catch (e) {
        if (toastNotifications) {
          toastNotifications.addDanger({
            title: i18n.translate(
              'xpack.triggersActionsUI.sections.actionsConnectorsList.unableToLoadActionTypesMessage',
              { defaultMessage: 'Unable to load action types' }
            ),
          });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registeredActionTypes = Object.entries(actionTypesIndex ?? [])
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

  const cardNodes = registeredActionTypes
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
