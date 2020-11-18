/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
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
import { loadActionTypes, loadAllActions as loadConnectors } from '../../lib/action_connector_api';
import {
  ActionTypeModel,
  AlertAction,
  ActionTypeIndex,
  ActionConnector,
  ActionType,
  ActionVariables,
} from '../../../types';
import { SectionLoading } from '../../components/section_loading';
import { ConnectorAddModal } from './connector_add_modal';
import { ActionTypeForm, ActionTypeFormProps } from './action_type_form';
import { AddConnectorInline } from './connector_add_inline';
import { actionTypeCompare } from '../../lib/action_type_compare';
import { checkActionFormActionTypeEnabled } from '../../lib/check_action_type_enabled';
import { VIEW_LICENSE_OPTIONS_LINK, DEFAULT_HIDDEN_ACTION_TYPES } from '../../../common/constants';
import { ActionGroup } from '../../../../../alerts/common';
import { useKibana } from '../../../common/lib/kibana';

export interface ActionAccordionFormProps {
  actions: AlertAction[];
  defaultActionGroupId: string;
  actionGroups?: ActionGroup[];
  setActionIdByIndex: (id: string, index: number) => void;
  setActionGroupIdByIndex?: (group: string, index: number) => void;
  setAlertProperty: (actions: AlertAction[]) => void;
  setActionParamsProperty: (key: string, value: any, index: number) => void;
  actionTypes?: ActionType[];
  messageVariables?: ActionVariables;
  defaultActionMessage?: string;
  setHasActionsDisabled?: (value: boolean) => void;
  setHasActionsWithBrokenConnector?: (value: boolean) => void;
}

interface ActiveActionConnectorState {
  actionTypeId: string;
  index: number;
}

export const ActionForm = ({
  actions,
  defaultActionGroupId,
  actionGroups,
  setActionIdByIndex,
  setActionGroupIdByIndex,
  setAlertProperty,
  setActionParamsProperty,
  actionTypes,
  messageVariables,
  defaultActionMessage,
  setHasActionsDisabled,
  setHasActionsWithBrokenConnector,
}: ActionAccordionFormProps) => {
  const { http, toastNotifications, capabilities, actionTypeRegistry } = useKibana().services;
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

  const closeAddConnectorModal = useCallback(() => setAddModalVisibility(false), [
    setAddModalVisibility,
  ]);

  // load action types
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingActionTypes(true);
        const registeredActionTypes = (
          actionTypes ?? (await loadActionTypes({ http }))
        ).sort((a, b) => a.name.localeCompare(b.name));
        const index: ActionTypeIndex = {};
        for (const actionTypeItem of registeredActionTypes) {
          index[actionTypeItem.id] = actionTypeItem;
        }
        setActionTypesIndex(index);
      } catch (e) {
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertForm.unableToLoadActionTypesMessage',
            { defaultMessage: 'Unable to load action types' }
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
        setConnectors(loadedConnectors);
      } catch (e) {
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertForm.unableToLoadActionsMessage',
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
      toastNotifications!.addDanger({
        title: i18n.translate('xpack.triggersActionsUI.sections.alertForm.unableToAddAction', {
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
            <EuiIcon size="xl" type={item.iconClass} />
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
        id="xpack.triggersActionsUI.sections.alertForm.loadingConnectorsDescription"
        defaultMessage="Loading connectors…"
      />
    </SectionLoading>
  ) : (
    <Fragment>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage
            defaultMessage="Actions"
            id="xpack.triggersActionsUI.sections.alertForm.actionSectionsTitle"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      {actionTypesIndex &&
        actions.map((actionItem: AlertAction, index: number) => {
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
                defaultActionGroupId={defaultActionGroupId}
                capabilities={capabilities}
                emptyActionsIds={emptyActionsIds}
                onDeleteConnector={() => {
                  const updatedActions = actions.filter(
                    (_item: AlertAction, i: number) => i !== index
                  );
                  setAlertProperty(updatedActions);
                  setIsAddActionPanelOpen(
                    updatedActions.filter((item: AlertAction) => item.id !== actionItem.id)
                      .length === 0
                  );
                  setActiveActionItem(undefined);
                }}
                onAddConnector={() => {
                  setActiveActionItem({ actionTypeId: actionItem.actionTypeId, index });
                  setAddModalVisibility(true);
                }}
              />
            );
          }

          const actionParamsErrors: ActionTypeFormProps['actionParamsErrors'] = actionTypeRegistry
            .get(actionItem.actionTypeId)
            ?.validateParams(actionItem.params);

          return (
            <ActionTypeForm
              actionItem={actionItem}
              actionConnector={actionConnector}
              actionParamsErrors={actionParamsErrors}
              index={index}
              capabilities={capabilities}
              key={`action-form-action-at-${index}`}
              setActionParamsProperty={setActionParamsProperty}
              actionTypesIndex={actionTypesIndex}
              connectors={connectors}
              defaultActionGroupId={defaultActionGroupId}
              defaultActionMessage={defaultActionMessage}
              messageVariables={messageVariables}
              actionGroups={actionGroups}
              setActionGroupIdByIndex={setActionGroupIdByIndex}
              onAddConnector={() => {
                setActiveActionItem({ actionTypeId: actionItem.actionTypeId, index });
                setAddModalVisibility(true);
              }}
              onConnectorSelected={(id: string) => {
                setActionIdByIndex(id, index);
              }}
              onDeleteAction={() => {
                const updatedActions = actions.filter(
                  (_item: AlertAction, i: number) => i !== index
                );
                setAlertProperty(updatedActions);
                setIsAddActionPanelOpen(
                  updatedActions.filter((item: AlertAction) => item.id !== actionItem.id).length ===
                    0
                );
                setActiveActionItem(undefined);
              }}
            />
          );
        })}
      <EuiSpacer size="m" />
      {isAddActionPanelOpen ? (
        <Fragment>
          <EuiFlexGroup id="alertActionTypeTitle" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h5>
                  <FormattedMessage
                    defaultMessage="Select an action type"
                    id="xpack.triggersActionsUI.sections.alertForm.selectAlertActionTypeTitle"
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
                        defaultMessage="Get more actions"
                        id="xpack.triggersActionsUI.sections.actionForm.getMoreActionsTitle"
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
                  id="xpack.triggersActionsUI.sections.alertForm.loadingActionTypesDescription"
                  defaultMessage="Loading action types…"
                />
              </SectionLoading>
            ) : (
              actionTypeNodes
            )}
          </EuiFlexGroup>
        </Fragment>
      ) : (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              data-test-subj="addAlertActionButton"
              onClick={() => setIsAddActionPanelOpen(true)}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertForm.addActionButtonLabel"
                defaultMessage="Add action"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {actionTypesIndex && activeActionItem && addModalVisible ? (
        <ConnectorAddModal
          key={activeActionItem.index}
          actionType={actionTypesIndex[activeActionItem.actionTypeId]}
          onClose={closeAddConnectorModal}
          postSaveEventHandler={(savedAction: ActionConnector) => {
            connectors.push(savedAction);
            setActionIdByIndex(savedAction.id, activeActionItem.index);
          }}
        />
      ) : null}
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { ActionForm as default };
