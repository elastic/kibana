/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { EuiFlexItem, EuiCard, EuiIcon, EuiFlexGrid, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import { ActionType, ActionTypeIndex } from '../../../types';
import { loadActionTypes } from '../../lib/action_connector_api';
import { useActionsConnectorsContext } from '../../context/actions_connectors_context';
import { actionTypeCompare } from '../../lib/action_type_compare';
import { checkActionTypeEnabled } from '../../lib/check_action_type_enabled';

interface Props {
  onActionTypeChange: (actionType: ActionType) => void;
  actionTypes?: ActionType[];
  setHasActionsUpgradeableByTrial?: (value: boolean) => void;
}

export const ActionTypeMenu = ({
  onActionTypeChange,
  actionTypes,
  setHasActionsUpgradeableByTrial,
}: Props) => {
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
        // determine if there are actions disabled by license that that
        // would be enabled by upgrading to gold or trial
        if (setHasActionsUpgradeableByTrial) {
          const hasActionsUpgradeableByTrial = availableActionTypes.some(
            (action) =>
              !index[action.id].enabledInLicense &&
              index[action.id].minimumLicenseRequired === 'gold'
          );
          setHasActionsUpgradeableByTrial(hasActionsUpgradeableByTrial);
        }
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
    .filter(([id, details]) => actionTypeRegistry.has(id) && details.enabledInConfig === true)
    .map(([id, actionType]) => {
      const actionTypeModel = actionTypeRegistry.get(id);
      return {
        iconClass: actionTypeModel ? actionTypeModel.iconClass : '',
        selectMessage: actionTypeModel ? actionTypeModel.selectMessage : '',
        actionType,
        name: actionType.name,
        typeName: id.replace('.', ''),
      };
    });

  const cardNodes = registeredActionTypes
    .sort((a, b) => actionTypeCompare(a.actionType, b.actionType))
    .map((item, index) => {
      const checkEnabledResult = checkActionTypeEnabled(item.actionType);
      const card = (
        <EuiCard
          titleSize="xs"
          data-test-subj={`${item.actionType.id}-card`}
          icon={<EuiIcon size="l" type={item.iconClass} />}
          title={item.name}
          description={item.selectMessage}
          isDisabled={!checkEnabledResult.isEnabled}
          onClick={() => onActionTypeChange(item.actionType)}
        />
      );

      return (
        <EuiFlexItem key={index}>
          {checkEnabledResult.isEnabled && card}
          {checkEnabledResult.isEnabled === false && (
            <EuiToolTip position="top" content={checkEnabledResult.message}>
              {card}
            </EuiToolTip>
          )}
        </EuiFlexItem>
      );
    });

  return (
    <div className="actConnectorsListGrid">
      <EuiSpacer size="s" />
      <EuiFlexGrid gutterSize="xl" columns={3}>
        {cardNodes}
      </EuiFlexGrid>
    </div>
  );
};
