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
  EuiEmptyPrompt,
  EuiText,
} from '@elastic/eui';
import {
  ActionGroup,
  RuleActionAlertsFilterProperty,
  RuleActionFrequency,
  RuleActionParam,
  RuleSystemAction,
} from '@kbn/alerting-plugin/common';
import { v4 as uuidv4 } from 'uuid';
import { TECH_PREVIEW_DESCRIPTION, TECH_PREVIEW_LABEL } from '../translations';
import { loadActionTypes, loadAllActions as loadConnectors } from '../../lib/action_connector_api';
import {
  ActionTypeModel,
  ActionTypeIndex,
  ActionConnector,
  ActionVariables,
  ActionTypeRegistryContract,
  NotifyWhenSelectOptions,
  RuleUiAction,
  RuleAction,
} from '../../../types';
import { SectionLoading } from '../../components/section_loading';
import { ActionTypeForm } from './action_type_form';
import { AddConnectorInline } from './connector_add_inline';
import { actionTypeCompare } from '../../lib/action_type_compare';
import { checkActionFormActionTypeEnabled } from '../../lib/check_action_type_enabled';
import { DEFAULT_FREQUENCY, VIEW_LICENSE_OPTIONS_LINK } from '../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { ConnectorAddModal } from '.';
import { suspendedComponentWithProps } from '../../lib/suspended_component_with_props';
import { OmitMessageVariablesType } from '../../lib/action_variables';
import { SystemActionTypeForm } from './system_action_type_form';

export interface ActionGroupWithMessageVariables extends ActionGroup<string> {
  omitMessageVariables?: OmitMessageVariablesType;
  defaultActionMessage?: string;
}
export interface ActionAccordionFormProps {
  actions: RuleUiAction[];
  defaultActionGroupId: string;
  actionGroups?: ActionGroupWithMessageVariables[];
  defaultActionMessage?: string;
  setActionIdByIndex: (id: string, index: number) => void;
  setActionGroupIdByIndex?: (group: string, index: number) => void;
  setActionUseAlertDataForTemplate?: (enabled: boolean, index: number) => void;
  setActions: (actions: RuleUiAction[]) => void;
  setActionParamsProperty: (key: string, value: RuleActionParam, index: number) => void;
  setActionFrequencyProperty: (key: string, value: RuleActionParam, index: number) => void;
  setActionAlertsFilterProperty: (
    key: string,
    value: RuleActionAlertsFilterProperty,
    index: number
  ) => void;
  featureId: string;
  producerId: string;
  ruleTypeId?: string;
  messageVariables?: ActionVariables;
  summaryMessageVariables?: ActionVariables;
  setHasActionsDisabled?: (value: boolean) => void;
  setHasActionsWithBrokenConnector?: (value: boolean) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
  recoveryActionGroup?: string;
  isActionGroupDisabledForActionType?: (actionGroupId: string, actionTypeId: string) => boolean;
  hideActionHeader?: boolean;
  hideNotifyWhen?: boolean;
  defaultSummaryMessage?: string;
  hasAlertsMappings?: boolean;
  minimumThrottleInterval?: [number | undefined, string];
  notifyWhenSelectOptions?: NotifyWhenSelectOptions[];
  defaultRuleFrequency?: RuleActionFrequency;
  hasFieldsForAAD?: boolean;
  disableErrorMessages?: boolean;
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
  setActionUseAlertDataForTemplate,
  setActions,
  setActionParamsProperty,
  setActionFrequencyProperty,
  setActionAlertsFilterProperty,
  featureId,
  messageVariables,
  summaryMessageVariables,
  actionGroups,
  defaultActionMessage,
  setHasActionsDisabled,
  setHasActionsWithBrokenConnector,
  actionTypeRegistry,
  recoveryActionGroup,
  isActionGroupDisabledForActionType,
  hideActionHeader,
  hideNotifyWhen,
  defaultSummaryMessage,
  hasAlertsMappings,
  minimumThrottleInterval,
  notifyWhenSelectOptions,
  defaultRuleFrequency = DEFAULT_FREQUENCY,
  ruleTypeId,
  producerId,
  hasFieldsForAAD,
  disableErrorMessages,
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
        const registeredActionTypes = (
          await loadActionTypes({
            http,
            featureId,
            includeSystemActions: true,
          })
        ).sort((a, b) => a.name.localeCompare(b.name));
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
        const loadedConnectors = await loadConnectors({ http, includeSystemActions: true });
        setConnectors(
          loadedConnectors.filter(
            (connector) => !connector.isMissingSecrets || connector.isSystemAction
          )
        );
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
    const allowGroupConnector = (actionTypeModel?.subtype ?? []).map((atm) => atm.id);
    const isSystemActionType = Boolean(
      actionTypesIndex && actionTypesIndex[actionTypeModel.id]?.isSystemActionType
    );
    let actionTypeConnectors = connectors.filter(
      (field) => field.actionTypeId === actionTypeModel.id
    );

    const actionToPush = isSystemActionType
      ? {
          id: '',
          actionTypeId: actionTypeModel.id,
          params: {},
          uuid: uuidv4(),
        }
      : {
          id: '',
          actionTypeId: actionTypeModel.id,
          group: defaultActionGroupId,
          params: {},
          frequency: defaultRuleFrequency,
          uuid: uuidv4(),
        };

    if (actionTypeConnectors.length === 0) {
      actionTypeConnectors = connectors.filter((field) =>
        allowGroupConnector.includes(field.actionTypeId)
      );
      if (actionTypeConnectors.length > 0) {
        // If a connector was successfully found, update the actionTypeId
        actions.push({ ...actionToPush, actionTypeId: actionTypeConnectors[0].actionTypeId });
        setActionIdByIndex(actionTypeConnectors[0].id, actions.length - 1);
      } else {
        // if no connectors exists or all connectors is already assigned an action under current alert
        // set actionType as id to be able to create new connector within the alert form
        actions.push(actionToPush);
        setActionIdByIndex(actions.length.toString(), actions.length - 1);
        setEmptyActionsIds([...emptyActionsIds, actions.length.toString()]);
      }
    } else {
      actions.push(actionToPush);
      setActionIdByIndex(actionTypeConnectors[0].id, actions.length - 1);
    }
  }

  let actionTypeNodes: Array<JSX.Element | null> | null = null;
  let hasDisabledByLicenseActionTypes = false;

  if (actionTypesIndex) {
    const preconfiguredConnectors = connectors.filter((connector) => connector.isPreconfigured);
    actionTypeNodes = actionTypeRegistry
      .list()
      .filter((item) => actionTypesIndex[item.id] && !item.hideInUi)
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

        const isSystemActionSelected = Boolean(
          actionTypesIndex[item.id].isSystemActionType &&
            actions.find((action) => action.actionTypeId === item.id)
        );

        const isDisabled = !checkEnabledResult.isEnabled || isSystemActionSelected;

        const keyPadItem = (
          <EuiKeyPadMenuItem
            key={index}
            isDisabled={isDisabled}
            data-test-subj={`${item.id}-${featureId}-ActionTypeSelectOption`}
            label={actionTypesIndex[item.id].name}
            betaBadgeLabel={item.isExperimental ? TECH_PREVIEW_LABEL : undefined}
            betaBadgeTooltipContent={item.isExperimental ? TECH_PREVIEW_DESCRIPTION : undefined}
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
      {!hideActionHeader && (
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
        </>
      )}
      {actionTypesIndex &&
        actions.map((actionItem: RuleUiAction, index: number) => {
          const isSystemActionType = Boolean(
            actionTypesIndex[actionItem.actionTypeId]?.isSystemActionType
          );

          const actionConnector = connectors.find((field) => field.id === actionItem.id);

          const onDeleteAction = () => {
            const updatedActions = actions.filter((_item: RuleUiAction, i: number) => i !== index);
            setActions(updatedActions);
            setIsAddActionPanelOpen(
              updatedActions.filter((item: RuleUiAction) => item.id !== actionItem.id).length === 0
            );
            setActiveActionItem(undefined);
          };

          if (isSystemActionType && !actionConnector) {
            return (
              <EuiEmptyPrompt
                title={
                  <EuiText color="danger">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.actionForm.unableToLoadSystemActionConnectorTitle"
                      defaultMessage="Unable to load connector"
                    />
                  </EuiText>
                }
              />
            );
          }
          // If connector does not exist
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
                onDeleteConnector={onDeleteAction}
                onAddConnector={() => {
                  setActiveActionItem({
                    actionTypeId: actionItem.actionTypeId,
                    indices: actions
                      .map((item: RuleUiAction, idx: number) =>
                        item.id === actionItem.id ? idx : -1
                      )
                      .filter((idx: number) => idx >= 0),
                  });
                  setAddModalVisibility(true);
                }}
                onSelectConnector={(connectorId: string) => {
                  setActionIdByIndex(connectorId, index);
                  const newConnector = connectors.find((connector) => connector.id === connectorId);
                  if (newConnector && newConnector.actionTypeId) {
                    const actionTypeRegistered = actionTypeRegistry.get(newConnector.actionTypeId);
                    if (actionTypeRegistered.convertParamsBetweenGroups) {
                      const updatedActions = actions.map((_item: RuleUiAction, i: number) => {
                        if (i === index) {
                          return {
                            ..._item,
                            actionTypeId: newConnector.actionTypeId,
                            id: connectorId,
                            params:
                              actionTypeRegistered.convertParamsBetweenGroups != null
                                ? actionTypeRegistered.convertParamsBetweenGroups(_item.params)
                                : {},
                          };
                        }
                        return _item;
                      });
                      setActions(updatedActions);
                    }
                  }
                }}
              />
            );
          }

          if (isSystemActionType) {
            return (
              <SystemActionTypeForm
                actionItem={actionItem as RuleSystemAction}
                actionConnector={actionConnector}
                index={index}
                key={`system-action-form-action-at-${actionItem.uuid}`}
                setActionParamsProperty={setActionParamsProperty}
                actionTypesIndex={actionTypesIndex}
                connectors={connectors}
                messageVariables={messageVariables}
                summaryMessageVariables={summaryMessageVariables}
                defaultActionMessage={defaultActionMessage}
                actionTypeRegistry={actionTypeRegistry}
                onDeleteAction={onDeleteAction}
                defaultSummaryMessage={defaultSummaryMessage}
                featureId={featureId}
                producerId={producerId}
                ruleTypeId={ruleTypeId}
                disableErrorMessages={disableErrorMessages}
              />
            );
          }

          return (
            <ActionTypeForm
              actionItem={actionItem as RuleAction}
              actionConnector={actionConnector}
              index={index}
              key={`action-form-action-at-${actionItem.uuid}`}
              setActionUseAlertDataForTemplate={setActionUseAlertDataForTemplate}
              setActionParamsProperty={setActionParamsProperty}
              setActionFrequencyProperty={setActionFrequencyProperty}
              setActionAlertsFilterProperty={setActionAlertsFilterProperty}
              actionTypesIndex={actionTypesIndex}
              connectors={connectors}
              defaultActionGroupId={defaultActionGroupId}
              messageVariables={messageVariables}
              summaryMessageVariables={summaryMessageVariables}
              actionGroups={actionGroups}
              defaultActionMessage={defaultActionMessage}
              recoveryActionGroup={recoveryActionGroup}
              isActionGroupDisabledForActionType={isActionGroupDisabledForActionType}
              setActionGroupIdByIndex={setActionGroupIdByIndex}
              onAddConnector={() => {
                setActiveActionItem({ actionTypeId: actionItem.actionTypeId, indices: [index] });
                setAddModalVisibility(true);
              }}
              onConnectorSelected={(id: string) => {
                setActionIdByIndex(id, index);
                const newConnector = connectors.find((connector) => connector.id === id);
                if (
                  newConnector &&
                  actionConnector &&
                  newConnector.actionTypeId !== actionConnector.actionTypeId
                ) {
                  const actionTypeRegistered = actionTypeRegistry.get(newConnector.actionTypeId);
                  if (actionTypeRegistered.convertParamsBetweenGroups) {
                    const updatedActions = actions.map((_item: RuleUiAction, i: number) => {
                      if (i === index) {
                        return {
                          ..._item,
                          actionTypeId: newConnector.actionTypeId,
                          id,
                          params:
                            actionTypeRegistered.convertParamsBetweenGroups != null
                              ? actionTypeRegistered.convertParamsBetweenGroups(_item.params)
                              : {},
                        };
                      }
                      return _item;
                    });
                    setActions(updatedActions);
                  }
                }
              }}
              actionTypeRegistry={actionTypeRegistry}
              onDeleteAction={() => {
                const updatedActions = actions.filter(
                  (_item: RuleUiAction, i: number) => i !== index
                );
                setActions(updatedActions);
                setIsAddActionPanelOpen(updatedActions.length === 0);
                setActiveActionItem(undefined);
              }}
              hideNotifyWhen={hideNotifyWhen}
              defaultSummaryMessage={defaultSummaryMessage}
              hasAlertsMappings={hasAlertsMappings}
              minimumThrottleInterval={minimumThrottleInterval}
              notifyWhenSelectOptions={notifyWhenSelectOptions}
              defaultNotifyWhenValue={defaultRuleFrequency.notifyWhen}
              featureId={featureId}
              producerId={producerId}
              ruleTypeId={ruleTypeId}
              hasFieldsForAAD={hasFieldsForAAD}
              disableErrorMessages={disableErrorMessages}
            />
          );
        })}
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
          <EuiFlexItem grow>
            <EuiButton
              size="m"
              fullWidth
              iconType="plusInCircle"
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
            // TODO: fix in https://github.com/elastic/kibana/issues/155993
            // actionTypes with subtypes need to be updated in case they switched to a
            // subtype that is not the default one
            actions[0].actionTypeId = savedAction.actionTypeId;
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
