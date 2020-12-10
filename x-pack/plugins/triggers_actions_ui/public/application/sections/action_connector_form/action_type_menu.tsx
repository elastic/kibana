/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { EuiFlexItem, EuiCard, EuiIcon, EuiFlexGrid, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import { ActionType, ActionTypeIndex, ActionTypeRegistryContract } from '../../../types';
import { loadActionTypes } from '../../lib/action_connector_api';
import { actionTypeCompare } from '../../lib/action_type_compare';
import { checkActionTypeEnabled } from '../../lib/check_action_type_enabled';
import { useKibana } from '../../../common/lib/kibana';
import { DEFAULT_HIDDEN_ACTION_TYPES } from '../../..';

interface Props {
  onActionTypeChange: (actionType: ActionType) => void;
  actionTypes?: ActionType[];
  setHasActionsUpgradeableByTrial?: (value: boolean) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
}

export const ActionTypeMenu = ({
  onActionTypeChange,
  actionTypes,
  setHasActionsUpgradeableByTrial,
  actionTypeRegistry,
}: Props) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        /**
         * Hidden action types will be hidden only on Alerts & Actions.
         * actionTypes prop is not filtered. Thus, any consumer that provides it's own actionTypes
         * can use the hidden action types. For example, Cases or Detections of Security Solution.
         *
         * TODO: Remove when cases connector is available across Kibana. Issue: https://github.com/elastic/kibana/issues/82502.
         *  */
        const availableActionTypes =
          actionTypes ??
          (await loadActionTypes({ http })).filter(
            (actionType) => !DEFAULT_HIDDEN_ACTION_TYPES.includes(actionType.id)
          );
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
        if (toasts) {
          toasts.addDanger({
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
          icon={<EuiIcon size="xl" type={item.iconClass} />}
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
