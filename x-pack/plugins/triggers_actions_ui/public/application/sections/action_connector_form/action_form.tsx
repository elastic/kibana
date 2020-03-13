/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiSpacer,
  EuiFormRow,
  EuiComboBox,
  EuiKeyPadMenuItem,
  EuiAccordion,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiButtonEmpty,
  EuiToolTip,
  EuiLink,
} from '@elastic/eui';
import { HttpSetup, ToastsApi } from 'kibana/public';
import { loadActionTypes, loadAllActions } from '../../lib/action_connector_api';
import {
  IErrorObject,
  ActionTypeModel,
  AlertAction,
  ActionTypeIndex,
  ActionConnector,
  ActionType,
} from '../../../types';
import { SectionLoading } from '../../components/section_loading';
import { ConnectorAddModal } from './connector_add_modal';
import { TypeRegistry } from '../../type_registry';
import { actionTypeCompare } from '../../lib/action_type_compare';
import { checkActionTypeEnabled } from '../../lib/check_action_type_enabled';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../../common/constants';
import './action_form.scss';

interface ActionAccordionFormProps {
  actions: AlertAction[];
  defaultActionGroupId: string;
  setActionIdByIndex: (id: string, index: number) => void;
  setAlertProperty: (actions: AlertAction[]) => void;
  setActionParamsProperty: (key: string, value: any, index: number) => void;
  http: HttpSetup;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  actionTypes?: ActionType[];
  messageVariables?: string[];
  defaultActionMessage?: string;
  setHasActionsDisabled?: (value: boolean) => void;
}

interface ActiveActionConnectorState {
  actionTypeId: string;
  index: number;
}

export const ActionForm = ({
  actions,
  defaultActionGroupId,
  setActionIdByIndex,
  setAlertProperty,
  setActionParamsProperty,
  http,
  actionTypeRegistry,
  actionTypes,
  messageVariables,
  defaultActionMessage,
  toastNotifications,
  setHasActionsDisabled,
}: ActionAccordionFormProps) => {
  const [addModalVisible, setAddModalVisibility] = useState<boolean>(false);
  const [activeActionItem, setActiveActionItem] = useState<ActiveActionConnectorState | undefined>(
    undefined
  );
  const [isAddActionPanelOpen, setIsAddActionPanelOpen] = useState<boolean>(true);
  const [connectors, setConnectors] = useState<ActionConnector[]>([]);
  const [isLoadingActionTypes, setIsLoadingActionTypes] = useState<boolean>(false);
  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);

  // load action types
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingActionTypes(true);
        const registeredActionTypes = actionTypes ?? (await loadActionTypes({ http }));
        const index: ActionTypeIndex = {};
        for (const actionTypeItem of registeredActionTypes) {
          index[actionTypeItem.id] = actionTypeItem;
        }
        setActionTypesIndex(index);
        const hasActionsDisabledByLicense = actions.some(
          action => !index[action.actionTypeId].enabledInLicense
        );
        if (setHasActionsDisabled) {
          setHasActionsDisabled(hasActionsDisabledByLicense);
        }
      } catch (e) {
        if (toastNotifications) {
          toastNotifications.addDanger({
            title: i18n.translate(
              'xpack.triggersActionsUI.sections.alertForm.unableToLoadActionTypesMessage',
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

  useEffect(() => {
    loadConnectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadConnectors() {
    try {
      const actionsResponse = await loadAllActions({ http });
      setConnectors(actionsResponse.data);
    } catch (e) {
      if (toastNotifications) {
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertForm.unableToLoadActionsMessage',
            {
              defaultMessage: 'Unable to load connectors',
            }
          ),
        });
      }
    }
  }

  const actionsErrors = actions.reduce(
    (acc: Record<string, { errors: IErrorObject }>, alertAction: AlertAction) => {
      const actionType = actionTypeRegistry.get(alertAction.actionTypeId);
      if (!actionType) {
        return { ...acc };
      }
      const actionValidationErrors = actionType.validateParams(alertAction.params);
      return { ...acc, [alertAction.id]: actionValidationErrors };
    },
    {}
  ) as Record<string, { errors: IErrorObject }>;

  const getSelectedOptions = (actionItemId: string) => {
    const val = connectors.find(connector => connector.id === actionItemId);
    if (!val) {
      return [];
    }
    return [
      {
        label: val.name,
        value: val.name,
        id: actionItemId,
      },
    ];
  };

  const getActionTypeForm = (
    actionItem: AlertAction,
    actionConnector: ActionConnector,
    index: number
  ) => {
    const optionsList = connectors
      .filter(
        connectorItem =>
          connectorItem.actionTypeId === actionItem.actionTypeId &&
          (connectorItem.id === actionItem.id ||
            !actions.find(
              (existingAction: AlertAction) =>
                existingAction.id === connectorItem.id && existingAction.group === actionItem.group
            ))
      )
      .map(({ name, id }) => ({
        label: name,
        key: id,
        id,
      }));
    const actionTypeRegistered = actionTypeRegistry.get(actionConnector.actionTypeId);
    if (!actionTypeRegistered || actionItem.group !== defaultActionGroupId) return null;
    const ParamsFieldsComponent = actionTypeRegistered.actionParamsFields;
    const actionParamsErrors: { errors: IErrorObject } =
      Object.keys(actionsErrors).length > 0 ? actionsErrors[actionItem.id] : { errors: {} };
    const checkEnabledResult = checkActionTypeEnabled(
      actionTypesIndex && actionTypesIndex[actionConnector.actionTypeId]
    );

    const accordionContent = checkEnabledResult.isEnabled ? (
      <Fragment>
        <EuiFlexGroup component="div">
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.alertForm.actionIdLabel"
                  defaultMessage="{connectorInstance} instance"
                  values={{
                    connectorInstance: actionTypesIndex
                      ? actionTypesIndex[actionConnector.actionTypeId].name
                      : actionConnector.actionTypeId,
                  }}
                />
              }
              labelAppend={
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => {
                    setActiveActionItem({ actionTypeId: actionItem.actionTypeId, index });
                    setAddModalVisibility(true);
                  }}
                >
                  <FormattedMessage
                    defaultMessage="Add new"
                    id="xpack.triggersActionsUI.sections.alertForm.addNewConnectorEmptyButton"
                  />
                </EuiButtonEmpty>
              }
            >
              <EuiComboBox
                fullWidth
                singleSelection={{ asPlainText: true }}
                options={optionsList}
                selectedOptions={getSelectedOptions(actionItem.id)}
                onChange={selectedOptions => {
                  setActionIdByIndex(selectedOptions[0].id ?? '', index);
                }}
                isClearable={false}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        {ParamsFieldsComponent ? (
          <ParamsFieldsComponent
            actionParams={actionItem.params as any}
            index={index}
            errors={actionParamsErrors.errors}
            editAction={setActionParamsProperty}
            messageVariables={messageVariables}
            defaultMessage={defaultActionMessage ?? undefined}
          />
        ) : null}
      </Fragment>
    ) : (
      checkEnabledResult.messageCard
    );

    return (
      <EuiAccordion
        initialIsOpen={true}
        key={index}
        id={index.toString()}
        className="euiAccordionForm"
        buttonContentClassName="euiAccordionForm__button"
        data-test-subj={`alertActionAccordion-${defaultActionGroupId}`}
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeRegistered.iconClass} size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <Fragment>
                  <h5>
                    <FormattedMessage
                      defaultMessage="Action: {actionConnectorName}"
                      id="xpack.triggersActionsUI.sections.alertForm.selectAlertActionTypeEditTitle"
                      values={{
                        actionConnectorName: actionConnector.name,
                      }}
                    />
                    {checkEnabledResult.isEnabled === false && (
                      <Fragment>
                        <span className="actActionForm__disabledActionWarningTitle">
                          <EuiIcon type="alert" />
                          <FormattedMessage
                            defaultMessage="This action is disabled"
                            id="xpack.triggersActionsUI.sections.alertForm.actionDisabledTitle"
                          />
                        </span>
                      </Fragment>
                    )}
                  </h5>
                </Fragment>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        extraAction={
          <EuiButtonIcon
            iconType="cross"
            color="danger"
            className="euiAccordionForm__extraAction"
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.sections.alertForm.accordion.deleteIconAriaLabel',
              {
                defaultMessage: 'Delete',
              }
            )}
            onClick={() => {
              const updatedActions = actions.filter(
                (item: AlertAction) => item.id !== actionItem.id
              );
              setAlertProperty(updatedActions);
              setIsAddActionPanelOpen(
                updatedActions.filter((item: AlertAction) => item.id !== actionItem.id).length === 0
              );
              setActiveActionItem(undefined);
            }}
          />
        }
        paddingSize="l"
      >
        {accordionContent}
      </EuiAccordion>
    );
  };

  const getAddConnectorsForm = (actionItem: AlertAction, index: number) => {
    const actionTypeName = actionTypesIndex
      ? actionTypesIndex[actionItem.actionTypeId].name
      : actionItem.actionTypeId;
    const actionTypeRegistered = actionTypeRegistry.get(actionItem.actionTypeId);
    if (!actionTypeRegistered || actionItem.group !== defaultActionGroupId) return null;
    return (
      <EuiAccordion
        initialIsOpen={true}
        key={index}
        id={index.toString()}
        className="euiAccordionForm"
        buttonContentClassName="euiAccordionForm__button"
        data-test-subj={`alertActionAccordion-${defaultActionGroupId}`}
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeRegistered.iconClass} size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h5>
                  <FormattedMessage
                    defaultMessage="Action: {actionConnectorName}"
                    id="xpack.triggersActionsUI.sections.alertForm.selectAlertActionTypeEditTitle"
                    values={{
                      actionConnectorName: actionTypeRegistered.actionTypeTitle,
                    }}
                  />
                </h5>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        extraAction={
          <EuiButtonIcon
            iconType="cross"
            color="danger"
            className="euiAccordionForm__extraAction"
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.sections.alertForm.accordion.deleteIconAriaLabel',
              {
                defaultMessage: 'Delete',
              }
            )}
            onClick={() => {
              const updatedActions = actions.filter(
                (item: AlertAction) => item.id !== actionItem.id
              );
              setAlertProperty(updatedActions);
              setIsAddActionPanelOpen(
                updatedActions.filter((item: AlertAction) => item.id !== actionItem.id).length === 0
              );
              setActiveActionItem(undefined);
            }}
          />
        }
        paddingSize="l"
      >
        <EuiEmptyPrompt
          title={
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertForm.emptyConnectorsLabel"
              defaultMessage="There are no {actionTypeName} connectors"
              values={{
                actionTypeName,
              }}
            />
          }
          actions={[
            <EuiButton
              color="primary"
              fill
              data-test-subj="createActionConnectorButton"
              onClick={() => {
                setActiveActionItem({ actionTypeId: actionItem.actionTypeId, index });
                setAddModalVisibility(true);
              }}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertForm.addConnectorButtonLabel"
                defaultMessage="Add {actionTypeName} connector"
                values={{
                  actionTypeName,
                }}
              />
            </EuiButton>,
          ]}
        />
      </EuiAccordion>
    );
  };

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
      field => field.actionTypeId === actionTypeModel.id
    );
    let freeConnectors;
    if (actionTypeConnectors.length > 0) {
      // Should we allow adding multiple actions to the same connector under the alert?
      freeConnectors = actionTypeConnectors.filter(
        (actionConnector: ActionConnector) =>
          !actions.find((actionItem: AlertAction) => actionItem.id === actionConnector.id)
      );
      if (freeConnectors.length > 0) {
        actions.push({
          id: '',
          actionTypeId: actionTypeModel.id,
          group: defaultActionGroupId,
          params: {},
        });
        setActionIdByIndex(freeConnectors[0].id, actions.length - 1);
      }
    }
    if (actionTypeConnectors.length === 0 || !freeConnectors || freeConnectors.length === 0) {
      // if no connectors exists or all connectors is already assigned an action under current alert
      // set actionType as id to be able to create new connector within the alert form
      actions.push({
        id: '',
        actionTypeId: actionTypeModel.id,
        group: defaultActionGroupId,
        params: {},
      });
      setActionIdByIndex(actions.length.toString(), actions.length - 1);
    }
  }

  let actionTypeNodes = null;
  let hasDisabledByLicenseActionTypes = false;
  if (actionTypesIndex) {
    actionTypeNodes = actionTypeRegistry
      .list()
      .filter(
        item => actionTypesIndex[item.id] && actionTypesIndex[item.id].enabledInConfig === true
      )
      .sort((a, b) => actionTypeCompare(actionTypesIndex[a.id], actionTypesIndex[b.id]))
      .map(function(item, index) {
        const actionType = actionTypesIndex[item.id];
        const checkEnabledResult = checkActionTypeEnabled(actionTypesIndex[item.id]);
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
          <Fragment>
            {checkEnabledResult.isEnabled && keyPadItem}
            {checkEnabledResult.isEnabled === false && (
              <EuiToolTip position="top" content={checkEnabledResult.message}>
                {keyPadItem}
              </EuiToolTip>
            )}
          </Fragment>
        );
      });
  }

  return (
    <Fragment>
      {actions.map((actionItem: AlertAction, index: number) => {
        const actionConnector = connectors.find(field => field.id === actionItem.id);
        // connectors doesn't exists
        if (!actionConnector) {
          return getAddConnectorsForm(actionItem, index);
        }
        return getActionTypeForm(actionItem, actionConnector, index);
      })}
      <EuiSpacer size="m" />
      {isAddActionPanelOpen === false ? (
        <EuiButton
          iconType="plusInCircle"
          data-test-subj="addAlertActionButton"
          onClick={() => setIsAddActionPanelOpen(true)}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertForm.addActionButtonLabel"
            defaultMessage="Add action"
          />
        </EuiButton>
      ) : null}
      {isAddActionPanelOpen ? (
        <Fragment>
          <EuiFlexGroup id="alertActionTypeTitle" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h5>
                  <FormattedMessage
                    defaultMessage="Actions: Select an action type"
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
                      className="actActionForm__getMoreActionsLink"
                    >
                      <EuiIcon type="starEmptySpace" />
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
          <EuiFlexGroup gutterSize="s" wrap>
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
      ) : null}
      {actionTypesIndex && activeActionItem ? (
        <ConnectorAddModal
          key={activeActionItem.index}
          actionType={actionTypesIndex[activeActionItem.actionTypeId]}
          addModalVisible={addModalVisible}
          setAddModalVisibility={setAddModalVisibility}
          postSaveEventHandler={(savedAction: ActionConnector) => {
            connectors.push(savedAction);
            setActionIdByIndex(savedAction.id, activeActionItem.index);
          }}
          actionTypeRegistry={actionTypeRegistry}
          http={http}
          toastNotifications={toastNotifications}
        />
      ) : null}
    </Fragment>
  );
};
