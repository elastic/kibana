/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Suspense, useState, useEffect } from 'react';
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
  EuiIconTip,
  EuiLink,
  EuiCallOut,
  EuiHorizontalRule,
  EuiText,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { HttpSetup, ToastsApi, ApplicationStart, DocLinksStart } from 'kibana/public';
import { loadActionTypes, loadAllActions as loadConnectors } from '../../lib/action_connector_api';
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
import { checkActionFormActionTypeEnabled } from '../../lib/check_action_type_enabled';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../../common/constants';
import { ServiceNowConnectorConfiguration } from '../../../common';

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
  docLinks: DocLinksStart;
  actionTypes?: ActionType[];
  messageVariables?: string[];
  defaultActionMessage?: string;
  setHasActionsDisabled?: (value: boolean) => void;
  capabilities: ApplicationStart['capabilities'];
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
  capabilities,
  docLinks,
}: ActionAccordionFormProps) => {
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
        setConnectors(
          loadedConnectors.filter(
            (action) =>
              action.actionTypeId !== ServiceNowConnectorConfiguration.id ||
              (action.actionTypeId === ServiceNowConnectorConfiguration.id &&
                !action.config.isCaseOwned)
          )
        );
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

  const preconfiguredMessage = i18n.translate(
    'xpack.triggersActionsUI.sections.actionForm.preconfiguredTitleMessage',
    {
      defaultMessage: '(preconfigured)',
    }
  );

  const getSelectedOptions = (actionItemId: string) => {
    const selectedConnector = connectors.find((connector) => connector.id === actionItemId);
    if (
      !selectedConnector ||
      // if selected connector is not preconfigured and action type is for preconfiguration only,
      // do not show regular connectors of this type
      (actionTypesIndex &&
        !actionTypesIndex[selectedConnector.actionTypeId].enabledInConfig &&
        !selectedConnector.isPreconfigured)
    ) {
      return [];
    }
    const optionTitle = `${selectedConnector.name} ${
      selectedConnector.isPreconfigured ? preconfiguredMessage : ''
    }`;
    return [
      {
        label: optionTitle,
        value: optionTitle,
        id: actionItemId,
        'data-test-subj': 'itemActionConnector',
      },
    ];
  };

  const getActionTypeForm = (
    actionItem: AlertAction,
    actionConnector: ActionConnector,
    actionParamsErrors: {
      errors: IErrorObject;
    },
    index: number
  ) => {
    if (!actionTypesIndex) {
      return null;
    }

    const actionType = actionTypesIndex[actionItem.actionTypeId];

    const optionsList = connectors
      .filter(
        (connectorItem) =>
          connectorItem.actionTypeId === actionItem.actionTypeId &&
          // include only enabled by config connectors or preconfigured
          (actionType.enabledInConfig || connectorItem.isPreconfigured)
      )
      .map(({ name, id, isPreconfigured }) => ({
        label: `${name} ${isPreconfigured ? preconfiguredMessage : ''}`,
        key: id,
        id,
      }));
    const actionTypeRegistered = actionTypeRegistry.get(actionConnector.actionTypeId);
    if (!actionTypeRegistered || actionItem.group !== defaultActionGroupId) return null;
    const ParamsFieldsComponent = actionTypeRegistered.actionParamsFields;
    const checkEnabledResult = checkActionFormActionTypeEnabled(
      actionTypesIndex[actionConnector.actionTypeId],
      connectors.filter((connector) => connector.isPreconfigured)
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
                  defaultMessage="{connectorInstance} connector"
                  values={{
                    connectorInstance: actionTypesIndex
                      ? actionTypesIndex[actionConnector.actionTypeId].name
                      : actionConnector.actionTypeId,
                  }}
                />
              }
              labelAppend={
                actionTypesIndex &&
                actionTypesIndex[actionConnector.actionTypeId].enabledInConfig ? (
                  <EuiButtonEmpty
                    size="xs"
                    data-test-subj={`addNewActionConnectorButton-${actionItem.actionTypeId}`}
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
                ) : null
              }
            >
              <EuiComboBox
                fullWidth
                singleSelection={{ asPlainText: true }}
                options={optionsList}
                id={`selectActionConnector-${actionItem.id}`}
                data-test-subj={`selectActionConnector-${actionItem.actionTypeId}`}
                selectedOptions={getSelectedOptions(actionItem.id)}
                onChange={(selectedOptions) => {
                  setActionIdByIndex(selectedOptions[0].id ?? '', index);
                }}
                isClearable={false}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        {ParamsFieldsComponent ? (
          <Suspense
            fallback={
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <ParamsFieldsComponent
              actionParams={actionItem.params as any}
              index={index}
              errors={actionParamsErrors.errors}
              editAction={setActionParamsProperty}
              messageVariables={messageVariables}
              defaultMessage={defaultActionMessage ?? undefined}
            />
          </Suspense>
        ) : null}
      </Fragment>
    ) : (
      checkEnabledResult.messageCard
    );

    return (
      <Fragment key={index}>
        <EuiAccordion
          initialIsOpen={true}
          id={index.toString()}
          className="actAccordionActionForm"
          buttonContentClassName="actAccordionActionForm__button"
          data-test-subj={`alertActionAccordion-${defaultActionGroupId}`}
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type={actionTypeRegistered.iconClass} size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  <div>
                    <EuiFlexGroup gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <FormattedMessage
                          defaultMessage="{actionConnectorName}"
                          id="xpack.triggersActionsUI.sections.alertForm.existingAlertActionTypeEditTitle"
                          values={{
                            actionConnectorName: `${actionConnector.name} ${
                              actionConnector.isPreconfigured ? preconfiguredMessage : ''
                            }`,
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        {checkEnabledResult.isEnabled === false && (
                          <Fragment>
                            <EuiIconTip
                              type="alert"
                              color="danger"
                              content={i18n.translate(
                                'xpack.triggersActionsUI.sections.alertForm.actionDisabledTitle',
                                {
                                  defaultMessage: 'This action is disabled',
                                }
                              )}
                              position="right"
                            />
                          </Fragment>
                        )}
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          extraAction={
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              className="actAccordionActionForm__extraAction"
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.sections.alertForm.accordion.deleteIconAriaLabel',
                {
                  defaultMessage: 'Delete',
                }
              )}
              onClick={() => {
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
          }
          paddingSize="l"
        >
          {accordionContent}
        </EuiAccordion>
        <EuiSpacer size="xs" />
      </Fragment>
    );
  };

  const getAddConnectorsForm = (actionItem: AlertAction, index: number) => {
    const actionTypeName = actionTypesIndex
      ? actionTypesIndex[actionItem.actionTypeId].name
      : actionItem.actionTypeId;
    const actionTypeRegistered = actionTypeRegistry.get(actionItem.actionTypeId);
    if (!actionTypeRegistered || actionItem.group !== defaultActionGroupId) return null;
    return (
      <Fragment key={index}>
        <EuiAccordion
          initialIsOpen={true}
          id={index.toString()}
          className="actAccordionActionForm"
          buttonContentClassName="actAccordionActionForm__button"
          data-test-subj={`alertActionAccordion-${defaultActionGroupId}`}
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type={actionTypeRegistered.iconClass} size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  <div>
                    <FormattedMessage
                      defaultMessage="{actionConnectorName}"
                      id="xpack.triggersActionsUI.sections.alertForm.newAlertActionTypeEditTitle"
                      values={{
                        actionConnectorName: actionTypeRegistered.actionTypeTitle,
                      }}
                    />
                  </div>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          extraAction={
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              className="actAccordionActionForm__extraAction"
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.sections.alertForm.accordion.deleteIconAriaLabel',
                {
                  defaultMessage: 'Delete',
                }
              )}
              onClick={() => {
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
          }
          paddingSize="l"
        >
          <EuiEmptyPrompt
            title={
              emptyActionsIds.find((emptyId: string) => actionItem.id === emptyId) ? (
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.alertForm.emptyConnectorsLabel"
                  defaultMessage="No {actionTypeName} connectors."
                  values={{
                    actionTypeName,
                  }}
                />
              ) : (
                <EuiCallOut
                  title={i18n.translate(
                    'xpack.triggersActionsUI.sections.alertForm.unableToLoadConnectorTitle',
                    {
                      defaultMessage: 'Unable to load connector.',
                    }
                  )}
                  color="warning"
                />
              )
            }
            actions={[
              <EuiButton
                color="primary"
                fill
                size="s"
                data-test-subj="createActionConnectorButton"
                onClick={() => {
                  setActiveActionItem({ actionTypeId: actionItem.actionTypeId, index });
                  setAddModalVisibility(true);
                }}
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.alertForm.addConnectorButtonLabel"
                  defaultMessage="Create a connector"
                />
              </EuiButton>,
            ]}
          />
        </EuiAccordion>
        <EuiSpacer size="xs" />
      </Fragment>
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

  const alertActionsList = actions.map((actionItem: AlertAction, index: number) => {
    const actionConnector = connectors.find((field) => field.id === actionItem.id);
    // connectors doesn't exists
    if (!actionConnector) {
      return getAddConnectorsForm(actionItem, index);
    }

    const actionErrors: { errors: IErrorObject } = actionTypeRegistry
      .get(actionItem.actionTypeId)
      ?.validateParams(actionItem.params);

    return getActionTypeForm(actionItem, actionConnector, actionErrors, index);
  });

  return (
    <Fragment>
      {isLoadingConnectors ? (
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
          {alertActionsList}
          {isAddActionPanelOpen === false ? (
            <div>
              <EuiHorizontalRule />
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
            </div>
          ) : null}
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
          ) : null}
        </Fragment>
      )}
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
          docLinks={docLinks}
          capabilities={capabilities}
        />
      ) : null}
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { ActionForm as default };
