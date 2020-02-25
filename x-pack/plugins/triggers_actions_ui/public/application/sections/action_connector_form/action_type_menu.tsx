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
}

export const ActionTypeMenu = ({ onActionTypeChange }: Props) => {
  const { http, toastNotifications, actionTypeRegistry } = useActionsConnectorsContext();
  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);
  const [isLoadingActionTypes, setIsLoadingActionTypes] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingActionTypes(true);
        const actionTypes = await loadActionTypes({ http });
        const index: ActionTypeIndex = {};
        for (const actionTypeItem of actionTypes) {
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
      } finally {
        setIsLoadingActionTypes(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actionTypes = Object.entries(actionTypesIndex ?? [])
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
