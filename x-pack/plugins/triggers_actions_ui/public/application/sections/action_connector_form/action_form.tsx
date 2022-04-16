/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiSpacer,
  EuiKeyPadMenuItem,
  EuiToolTip,
  EuiLink,
} from '@elastic/eui';
import { ActionGroup, RuleActionParam } from '@kbn/alerting-plugin/common';
import { loadActionTypes, loadAllActions as loadConnectors } from '../../lib/action_connector_api';
import {
  ActionTypeModel,
  RuleAction,
  ActionTypeIndex,
  ActionConnector,
  ActionType,
  ActionVariables,
  ActionTypeRegistryContract,
} from '../../../types';
import { SectionLoading } from '../../components/section_loading';
import { ActionTypeForm } from './action_type_form';
import { AddConnectorInline } from './connector_add_inline';
import { actionTypeCompare } from '../../lib/action_type_compare';
import { checkActionFormActionTypeEnabled } from '../../lib/check_action_type_enabled';
import { VIEW_LICENSE_OPTIONS_LINK, DEFAULT_HIDDEN_ACTION_TYPES } from '../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { DefaultActionParamsGetter } from '../../lib/get_defaults_for_action_params';
import { ConnectorAddModal } from '.';
import { suspendedComponentWithProps } from '../../lib/suspended_component_with_props';
import { OmitMessageVariablesType } from '../../lib/action_variables';

export interface ActionGroupWithMessageVariables extends ActionGroup<string> {
  omitMessageVariables?: OmitMessageVariablesType;
  defaultActionMessage?: string;
}

export interface ActionAccordionFormProps {
  actions: RuleAction[];
  defaultActionGroupId: string;
  actionGroups?: ActionGroupWithMessageVariables[];
  defaultActionMessage?: string;
  setActionIdByIndex: (id: string, index: number) => void;
  setActionGroupIdByIndex?: (group: string, index: number) => void;
  setActions: (actions: RuleAction[]) => void;
  setActionParamsProperty: (key: string, value: RuleActionParam, index: number) => void;
  actionTypes?: ActionType[];
  messageVariables?: ActionVariables;
  setHasActionsDisabled?: (value: boolean) => void;
  setHasActionsWithBrokenConnector?: (value: boolean) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
  getDefaultActionParams?: DefaultActionParamsGetter;
  isActionGroupDisabledForActionType?: (actionGroupId: string, actionTypeId: string) => boolean;
}

interface ActiveActionConnectorState {
  actionTypeId: string;
  indices: number[];
}

export const ActionForm = ({
  actions,
  defaultActionGroupId,
  setActionIdByIndex,
  setActionGroupIdByIndex,
  setActions,
  setActionParamsProperty,
  actionTypes,
  messageVariables,
  actionGroups,
  defaultActionMessage,
  setHasActionsDisabled,
  setHasActionsWithBrokenConnector,
  actionTypeRegistry,
  getDefaultActionParams,
  isActionGroupDisabledForActionType,
}: ActionAccordionFormProps) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const [addModalVisible, setAddModalVisibility] = useState<boolean>(false);
  const [activeActionItem, setActiveActionItem] = useState<ActiveActionConnectorState | undefined>(
    undefined
  );
  const [isAddActionPanelOpen, setIsAddActionPanelOpen] = useState<boolean>(true);
  const [connectors, setConnectors] = useState<ActionConnector[]>([]);
  const [isLoadingConnectors, setIsLoadingConnectors] = useState<boolean>(false);
  const [isLoadingActionTypes, setIsLoadingActionTypes] = useState<boolean>(false);
  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);
  const [emptyActionsIds, setEmptyActionsIds] = useState<string[]>([]);

  const closeAddConnectorModal = useCallback(
    () => setAddModalVisibility(false),
    [setAddModalVisibility]
  );

  // load action types
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingActionTypes(true);
        const registeredActionTypes = (actionTypes ?? (await loadActionTypes({ http }))).sort(
          (a, b) => a.name.localeCompare(b.name)
        );
        const index: ActionTypeIndex = {};
        for (const actionTypeItem of registeredActionTypes) {
          index[actionTypeItem.id] = actionTypeItem;
        }
        setActionTypesIndex(index);
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.actionForm.unableToLoadConnectorTypesMessage',
            { defaultMessage: 'Unable to load connector types' }
          ),
        });
      } finally {
        setIsLoadingActionTypes(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load connectors
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingConnectors(true);
        const loadedConnectors = await loadConnectors({ http });
        setConnectors(loadedConnectors.filter((connector) => !connector.isMissingSecrets));
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.actionForm.unableToLoadActionsMessage',
            {
              defaultMessage: 'Unable to load connectors',
            }
          ),
        });
      } finally {
        setIsLoadingConnectors(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const setActionTypesAvalilability = () => {
      const preconfiguredConnectors = connectors.filter((connector) => connector.isPreconfigured);
      const hasActionsDisabled = actions.some(
        (action) =>
          actionTypesIndex &&
          !actionTypesIndex[action.actionTypeId].enabled &&
          !checkActionFormActionTypeEnabled(
            actionTypesIndex[action.actionTypeId],
            preconfiguredConnectors
          ).isEnabled
      );
      if (setHasActionsDisabled) {
        setHasActionsDisabled(hasActionsDisabled);
      }
    };
    if (connectors.length > 0 && actionTypesIndex) {
      setActionTypesAvalilability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectors, actionTypesIndex]);

  useEffect(() => {
    const hasActionWithBrokenConnector = actions.some(
      (action) => !connectors.find((connector) => connector.id === action.id)
    );
    if (setHasActionsWithBrokenConnector) {
      setHasActionsWithBrokenConnector(hasActionWithBrokenConnector);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, connectors]);

  function addActionType(actionTypeModel: ActionTypeModel) {
    if (!defaultActionGroupId) {
      toasts!.addDanger({
        title: i18n.translate('xpack.triggersActionsUI.sections.actionForm.unableToAddAction', {
          defaultMessage: 'Unable to add action, because default action group is not defined',
        }),
      });
      return;
    }
    setIsAddActionPanelOpen(false);
    const actionTypeConnectors = connectors.filter(
      (field) => field.actionTypeId === actionTypeModel.id
    );

    if (actionTypeConnectors.length > 0) {
      actions.push({
        id: '',
        actionTypeId: actionTypeModel.id,
        group: defaultActionGroupId,
        params: {},
      });
      setActionIdByIndex(actionTypeConnectors[0].id, actions.length - 1);
    }
    if (actionTypeConnectors.length === 0) {
      // if no connectors exists or all connectors is already assigned an action under current alert
      // set actionType as id to be able to create new connector within the alert form
      actions.push({
        id: '',
        actionTypeId: actionTypeModel.id,
        group: defaultActionGroupId,
        params: {},
      });
      setActionIdByIndex(actions.length.toString(), actions.length - 1);
      setEmptyActionsIds([...emptyActionsIds, actions.length.toString()]);
    }
  }

  let actionTypeNodes: Array<JSX.Element | null> | null = null;
  let hasDisabledByLicenseActionTypes = false;
  if (actionTypesIndex) {
    const preconfiguredConnectors = connectors.filter((connector) => connector.isPreconfigured);
    actionTypeNodes = actionTypeRegistry
      .list()
      /**
       * TODO: Remove when cases connector is available across Kibana. Issue: https://github.com/elastic/kibana/issues/82502.
       * If actionTypes are set, hidden connectors are filtered out. Otherwise, they are not.
       */
      .filter(({ id }) => actionTypes ?? !DEFAULT_HIDDEN_ACTION_TYPES.includes(id))
      .filter((item) => actionTypesIndex[item.id])
      .filter((item) => !!item.actionParamsFields)
      .sort((a, b) =>
        actionTypeCompare(actionTypesIndex[a.id], actionTypesIndex[b.id], preconfiguredConnectors)
      )
      .map(function (item, index) {
        const actionType = actionTypesIndex[item.id];
        const checkEnabledResult = checkActionFormActionTypeEnabled(
          actionTypesIndex[item.id],
          preconfiguredConnectors
        );
        // if action type is not enabled in config and not preconfigured, it shouldn't be displayed
        if (!actionType.enabledInConfig && !checkEnabledResult.isEnabled) {
          return null;
        }
        if (!actionType.enabledInLicense) {
          hasDisabledByLicenseActionTypes = true;
        }

        const keyPadItem = (
          <EuiKeyPadMenuItem
            key={index}
            isDisabled={!checkEnabledResult.isEnabled}
            data-test-subj={`${item.id}-ActionTypeSelectOption`}
            label={actionTypesIndex[item.id].name}
            onClick={() => addActionType(item)}
          >
            <EuiIcon
              size="xl"
              type={
                typeof item.iconClass === 'string'
                  ? item.iconClass
                  : suspendedComponentWithProps(item.iconClass as React.ComponentType)
              }
            />
          </EuiKeyPadMenuItem>
        );

        return (
          <EuiFlexItem grow={false} key={`keypad-${item.id}`}>
            {checkEnabledResult.isEnabled && keyPadItem}
            {checkEnabledResult.isEnabled === false && (
              <EuiToolTip position="top" content={checkEnabledResult.message}>
                {keyPadItem}
              </EuiToolTip>
            )}
          </EuiFlexItem>
        );
      });
  }

  return isLoadingConnectors ? (
    <SectionLoading>
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.actionForm.loadingConnectorsDescription"
        defaultMessage="Loading connectors…"
      />
    </SectionLoading>
  ) : (
    <>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage
            defaultMessage="Actions"
            id="xpack.triggersActionsUI.sections.actionForm.actionSectionsTitle"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      {actionTypesIndex &&
        actions.map((actionItem: RuleAction, index: number) => {
          const actionConnector = connectors.find((field) => field.id === actionItem.id);
          // connectors doesn't exists
          if (!actionConnector) {
            return (
              <AddConnectorInline
                actionTypesIndex={actionTypesIndex}
                actionItem={actionItem}
                index={index}
                key={`action-form-action-at-${index}`}
                actionTypeRegistry={actionTypeRegistry}
                emptyActionsIds={emptyActionsIds}
                connectors={connectors}
                onDeleteConnector={() => {
                  const updatedActions = actions.filter(
                    (_item: RuleAction, i: number) => i !== index
                  );
                  setActions(updatedActions);
                  setIsAddActionPanelOpen(
                    updatedActions.filter((item: RuleAction) => item.id !== actionItem.id)
                      .length === 0
                  );
                  setActiveActionItem(undefined);
                }}
                onAddConnector={() => {
                  setActiveActionItem({
                    actionTypeId: actionItem.actionTypeId,
                    indices: actions
                      .map((item: RuleAction, idx: number) =>
                        item.id === actionItem.id ? idx : -1
                      )
                      .filter((idx: number) => idx >= 0),
                  });
                  setAddModalVisibility(true);
                }}
                onSelectConnector={(connectorId: string) => {
                  setActionIdByIndex(connectorId, index);
                }}
              />
            );
          }

          return (
            <ActionTypeForm
              actionItem={actionItem}
              actionConnector={actionConnector}
              index={index}
              key={`action-form-action-at-${index}`}
              setActionParamsProperty={setActionParamsProperty}
              actionTypesIndex={actionTypesIndex}
              connectors={connectors}
              defaultActionGroupId={defaultActionGroupId}
              messageVariables={messageVariables}
              actionGroups={actionGroups}
              defaultActionMessage={defaultActionMessage}
              defaultParams={getDefaultActionParams?.(actionItem.actionTypeId, actionItem.group)}
              isActionGroupDisabledForActionType={isActionGroupDisabledForActionType}
              setActionGroupIdByIndex={setActionGroupIdByIndex}
              onAddConnector={() => {
                setActiveActionItem({ actionTypeId: actionItem.actionTypeId, indices: [index] });
                setAddModalVisibility(true);
              }}
              onConnectorSelected={(id: string) => {
                setActionIdByIndex(id, index);
              }}
              actionTypeRegistry={actionTypeRegistry}
              onDeleteAction={() => {
                const updatedActions = actions.filter(
                  (_item: RuleAction, i: number) => i !== index
                );
                setActions(updatedActions);
                setIsAddActionPanelOpen(
                  updatedActions.filter((item: RuleAction) => item.id !== actionItem.id).length ===
                    0
                );
                setActiveActionItem(undefined);
              }}
            />
          );
        })}
      <EuiSpacer size="m" />
      {isAddActionPanelOpen ? (
        <>
          <EuiFlexGroup id="alertActionTypeTitle" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h5>
                  <FormattedMessage
                    defaultMessage="Select a connector type"
                    id="xpack.triggersActionsUI.sections.actionForm.selectConnectorTypeTitle"
                  />
                </h5>
              </EuiTitle>
            </EuiFlexItem>
            {hasDisabledByLicenseActionTypes && (
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h5>
                    <EuiLink
                      href={VIEW_LICENSE_OPTIONS_LINK}
                      target="_blank"
                      external
                      className="actActionForm__getMoreActionsLink"
                    >
                      <FormattedMessage
                        defaultMessage="Get more connectors"
                        id="xpack.triggersActionsUI.sections.actionForm.getMoreConnectorsTitle"
                      />
                    </EuiLink>
                  </h5>
                </EuiTitle>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiFlexGroup gutterSize="m" wrap>
            {isLoadingActionTypes ? (
              <SectionLoading>
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.actionForm.loadingConnectorTypesDescription"
                  defaultMessage="Loading connector types…"
                />
              </SectionLoading>
            ) : (
              actionTypeNodes
            )}
          </EuiFlexGroup>
        </>
      ) : (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              data-test-subj="addAlertActionButton"
              onClick={() => setIsAddActionPanelOpen(true)}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.actionForm.addActionButtonLabel"
                defaultMessage="Add action"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {actionTypesIndex && activeActionItem && addModalVisible ? (
        <ConnectorAddModal
          actionType={actionTypesIndex[activeActionItem.actionTypeId]}
          onClose={closeAddConnectorModal}
          postSaveEventHandler={(savedAction: ActionConnector) => {
            connectors.push(savedAction);
            const indicesToUpdate = activeActionItem.indices || [];
            indicesToUpdate.forEach((index: number) => setActionIdByIndex(savedAction.id, index));
          }}
          actionTypeRegistry={actionTypeRegistry}
        />
      ) : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ActionForm as default };
