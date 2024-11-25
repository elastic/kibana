/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexItem, EuiCard, EuiIcon, EuiFlexGrid, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { checkActionTypeEnabled } from '@kbn/alerts-ui-shared/src/rule_form/utils/check_action_type_enabled';
import { TECH_PREVIEW_DESCRIPTION, TECH_PREVIEW_LABEL } from '../translations';
import { ActionType, ActionTypeIndex, ActionTypeRegistryContract } from '../../../types';
import { loadActionTypes } from '../../lib/action_connector_api';
import { actionTypeCompare } from '../../lib/action_type_compare';
import { useKibana } from '../../../common/lib/kibana';
import { SectionLoading } from '../../components/section_loading';

interface Props {
  onActionTypeChange: (actionType: ActionType) => void;
  featureId?: string;
  setHasActionsUpgradeableByTrial?: (value: boolean) => void;
  setAllActionTypes?: (actionsType: ActionTypeIndex) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
}

export const ActionTypeMenu = ({
  onActionTypeChange,
  featureId,
  setHasActionsUpgradeableByTrial,
  setAllActionTypes,
  actionTypeRegistry,
}: Props) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const [loadingActionTypes, setLoadingActionTypes] = useState<boolean>(false);
  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);
  useEffect(() => {
    (async () => {
      try {
        setLoadingActionTypes(true);
        const availableActionTypes = await loadActionTypes({ http, featureId });
        setLoadingActionTypes(false);

        const index: ActionTypeIndex = {};
        for (const actionTypeItem of availableActionTypes) {
          index[actionTypeItem.id] = actionTypeItem;
        }
        setActionTypesIndex(index);
        if (setAllActionTypes) {
          setAllActionTypes(index);
        }
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
              'xpack.triggersActionsUI.sections.actionsConnectorsList.unableToLoadConnectorTypesMessage',
              { defaultMessage: 'Unable to load connector types' }
            ),
          });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const registeredActionTypes = Object.entries(actionTypesIndex ?? [])
    .filter(
      ([id, details]) =>
        actionTypeRegistry.has(id) &&
        details.enabledInConfig === true &&
        !actionTypeRegistry.get(id).hideInUi
    )
    .map(([id, actionType]) => {
      const actionTypeModel = actionTypeRegistry.get(id);
      return {
        iconClass: actionTypeModel ? actionTypeModel.iconClass : '',
        selectMessage: actionTypeModel ? actionTypeModel.selectMessage : '',
        actionType,
        name: actionType.name,
        isExperimental: actionTypeModel.isExperimental,
      };
    });

  const cardNodes = registeredActionTypes
    .sort((a, b) => actionTypeCompare(a.actionType, b.actionType))
    .map((item, index) => {
      const checkEnabledResult = checkActionTypeEnabled(item.actionType);
      const card = (
        <EuiCard
          betaBadgeProps={
            item.isExperimental
              ? { label: TECH_PREVIEW_LABEL, tooltipContent: TECH_PREVIEW_DESCRIPTION }
              : undefined
          }
          titleSize="xs"
          data-test-subj={`${item.actionType.id}-card`}
          icon={<EuiIcon size="xl" type={item.iconClass} />}
          title={item.name}
          description={item.selectMessage}
          isDisabled={!checkEnabledResult.isEnabled}
          onClick={() => {
            onActionTypeChange(item.actionType);
          }}
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

  return loadingActionTypes ? (
    <SectionLoading>
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.actionsConnectorsList.loadingConnectorTypesDescription"
        defaultMessage="Loading connector types…"
      />
    </SectionLoading>
  ) : (
    <div className="actConnectorsListGrid">
      <EuiSpacer size="s" />
      <EuiFlexGrid gutterSize="xl" columns={3}>
        {cardNodes}
      </EuiFlexGrid>
    </div>
  );
};
