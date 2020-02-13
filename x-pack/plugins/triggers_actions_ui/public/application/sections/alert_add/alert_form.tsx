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
  EuiForm,
  EuiSpacer,
  EuiFieldText,
  EuiFlexGrid,
  EuiFormRow,
  EuiComboBox,
  EuiKeyPadMenuItem,
  EuiFieldNumber,
  EuiSelect,
  EuiIconTip,
  EuiAccordion,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiButtonEmpty,
  EuiHorizontalRule,
} from '@elastic/eui';
import { loadAlertTypes } from '../../lib/alert_api';
import { loadActionTypes, loadAllActions } from '../../lib/action_connector_api';
import { AlertReducerAction } from './alert_reducer';
import {
  AlertTypeModel,
  Alert,
  IErrorObject,
  ActionTypeModel,
  AlertAction,
  ActionTypeIndex,
  ActionConnector,
  AlertTypeIndex,
  ActionGroup,
} from '../../../types';
import { SectionLoading } from '../../components/section_loading';
import { ConnectorAddModal } from '../action_connector_form/connector_add_modal';
import { getTimeOptions } from '../../../common/lib/get_time_options';
import { useAlertsContext } from '../../context/alerts_context';

export function validateBaseProperties(alertObject: Alert) {
  const validationResult = { errors: {} };
  const errors = {
    name: new Array<string>(),
    interval: new Array<string>(),
    alertTypeId: new Array<string>(),
    actionConnectors: new Array<string>(),
  };
  validationResult.errors = errors;
  if (!alertObject.name) {
    errors.name.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredNameText', {
        defaultMessage: 'Name is required.',
      })
    );
  }
  if (!alertObject.schedule.interval) {
    errors.interval.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredIntervalText', {
        defaultMessage: 'Check interval is required.',
      })
    );
  }
  if (!alertObject.alertTypeId) {
    errors.alertTypeId.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredAlertTypeIdText', {
        defaultMessage: 'Alert trigger is required.',
      })
    );
  }
  return validationResult;
}

interface AlertFormProps {
  alert: Alert;
  dispatch: React.Dispatch<AlertReducerAction>;
  errors: IErrorObject;
  serverError: {
    body: { message: string; error: string };
  } | null;
  canChangeTrigger?: boolean; // to hide Change trigger button
}

interface ActiveActionConnectorState {
  actionTypeId: string;
  index: number;
}

export const AlertForm = ({
  alert,
  canChangeTrigger = true,
  dispatch,
  errors,
  serverError,
}: AlertFormProps) => {
  const alertsContext = useAlertsContext();
  const { http, toastNotifications, alertTypeRegistry, actionTypeRegistry } = alertsContext;

  const [alertTypeModel, setAlertTypeModel] = useState<AlertTypeModel | null>(
    alertTypeRegistry.get(alert.alertTypeId)
  );

  const [addModalVisible, setAddModalVisibility] = useState<boolean>(false);
  const [isLoadingActionTypes, setIsLoadingActionTypes] = useState<boolean>(false);
  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);
  const [alertTypesIndex, setAlertTypesIndex] = useState<AlertTypeIndex | undefined>(undefined);
  const [alertInterval, setAlertInterval] = useState<number | null>(null);
  const [alertIntervalUnit, setAlertIntervalUnit] = useState<string>('m');
  const [alertThrottle, setAlertThrottle] = useState<number | null>(null);
  const [alertThrottleUnit, setAlertThrottleUnit] = useState<string>('m');
  const [isAddActionPanelOpen, setIsAddActionPanelOpen] = useState<boolean>(true);
  const [connectors, setConnectors] = useState<ActionConnector[]>([]);
  const [defaultActionGroup, setDefaultActionGroup] = useState<ActionGroup | undefined>(undefined);
  const [activeActionItem, setActiveActionItem] = useState<ActiveActionConnectorState | undefined>(
    undefined
  );

  // load action types
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

  // load alert types
  useEffect(() => {
    (async () => {
      try {
        const alertTypes = await loadAlertTypes({ http });
        // temp hack of API result
        alertTypes.push({
          id: 'threshold',
          actionGroups: [
            { id: 'alert', name: 'Alert' },
            { id: 'warning', name: 'Warning' },
            { id: 'ifUnacknowledged', name: 'If unacknowledged' },
          ],
          name: 'threshold',
          actionVariables: ['ctx.metadata.name', 'ctx.metadata.test'],
        });
        const index: AlertTypeIndex = {};
        for (const alertTypeItem of alertTypes) {
          index[alertTypeItem.id] = alertTypeItem;
        }
        if (alert.alertTypeId) {
          setDefaultActionGroup(index[alert.alertTypeId].actionGroups[0]);
        }
        setAlertTypesIndex(index);
      } catch (e) {
        if (toastNotifications) {
          toastNotifications.addDanger({
            title: i18n.translate(
              'xpack.triggersActionsUI.sections.alertForm.unableToLoadAlertTypesMessage',
              { defaultMessage: 'Unable to load alert types' }
            ),
          });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadConnectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAlertProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const setAlertParams = (key: string, value: any) => {
    dispatch({ command: { type: 'setAlertParams' }, payload: { key, value } });
  };

  const setScheduleProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setScheduleProperty' }, payload: { key, value } });
  };

  const setActionParamsProperty = (key: string, value: any, index: number) => {
    dispatch({ command: { type: 'setAlertActionParams' }, payload: { key, value, index } });
  };

  const setActionProperty = (key: string, value: any, index: number) => {
    dispatch({ command: { type: 'setAlertActionProperty' }, payload: { key, value, index } });
  };

  const tagsOptions = alert.tags ? alert.tags.map((label: string) => ({ label })) : [];

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

  const actionsErrors = alert.actions.reduce(
    (acc: Record<string, { errors: IErrorObject }>, alertAction: AlertAction) => {
      const actionType = actionTypeRegistry.get(alertAction.actionTypeId);
      if (!actionType) {
        return { ...acc };
      }
      const actionValidationErrors = actionType.validateParams(alertAction.params);
      return { ...acc, [alertAction.id]: actionValidationErrors };
    },
    {}
  );

  const AlertParamsExpressionComponent = alertTypeModel
    ? alertTypeModel.alertParamsExpression
    : null;

  function addActionType(actionTypeModel: ActionTypeModel) {
    setIsAddActionPanelOpen(false);
    const actionTypeConnectors = connectors.filter(
      field => field.actionTypeId === actionTypeModel.id
    );
    let freeConnectors;
    if (actionTypeConnectors.length > 0) {
      // Should we allow adding multiple actions to the same connector under the alert?
      freeConnectors = actionTypeConnectors.filter(
        (actionConnector: ActionConnector) =>
          !alert.actions.find((actionItem: AlertAction) => actionItem.id === actionConnector.id)
      );
      if (freeConnectors.length > 0) {
        alert.actions.push({
          id: '',
          actionTypeId: actionTypeModel.id,
          group: defaultActionGroup?.id ?? 'Alert',
          params: {},
        });
        setActionProperty('id', freeConnectors[0].id, alert.actions.length - 1);
      }
    }
    if (actionTypeConnectors.length === 0 || !freeConnectors || freeConnectors.length === 0) {
      // if no connectors exists or all connectors is already assigned an action under current alert
      // set actionType as id to be able to create new connector within the alert form
      alert.actions.push({
        id: '',
        actionTypeId: actionTypeModel.id,
        group: defaultActionGroup?.id ?? 'Alert',
        params: {},
      });
      setActionProperty('id', alert.actions.length, alert.actions.length - 1);
    }
  }

  const alertTypeNodes = alertTypeRegistry.list().map(function(item, index) {
    return (
      <EuiKeyPadMenuItem
        key={index}
        data-test-subj={`${item.id}-SelectOption`}
        label={item.name}
        onClick={() => {
          setAlertProperty('alertTypeId', item.id);
          setAlertTypeModel(item);
          if (
            alertTypesIndex &&
            alertTypesIndex[item.id] &&
            alertTypesIndex[item.id].actionGroups.length > 0
          ) {
            setDefaultActionGroup(alertTypesIndex[item.id].actionGroups[0]);
          }
        }}
      >
        <EuiIcon size="xl" type={item.iconClass} />
      </EuiKeyPadMenuItem>
    );
  });

  const actionTypeNodes = actionTypeRegistry.list().map(function(item, index) {
    return (
      <EuiKeyPadMenuItem
        key={index}
        data-test-subj={`${item.id}-ActionTypeSelectOption`}
        label={actionTypesIndex ? actionTypesIndex[item.id].name : item.id}
        onClick={() => addActionType(item)}
      >
        <EuiIcon size="xl" type={item.iconClass} />
      </EuiKeyPadMenuItem>
    );
  });

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
            !alert.actions.find(
              (existingAction: AlertAction) =>
                existingAction.id === connectorItem.id && existingAction.group === actionItem.group
            ))
      )
      .map(({ name, id }) => ({
        label: name,
        key: id,
        id,
      }));
    const actionTypeRegisterd = actionTypeRegistry.get(actionConnector.actionTypeId);
    if (actionTypeRegisterd === null || actionItem.group !== defaultActionGroup?.id) return null;
    const ParamsFieldsComponent = actionTypeRegisterd.actionParamsFields;
    const actionParamsErrors: { errors: IErrorObject } =
      Object.keys(actionsErrors).length > 0 ? actionsErrors[actionItem.id] : { errors: {} };

    return (
      <EuiAccordion
        initialIsOpen={true}
        key={index}
        id={index.toString()}
        className="euiAccordionForm"
        buttonContentClassName="euiAccordionForm__button"
        data-test-subj="alertActionAccordion"
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeRegisterd.iconClass} size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h5>
                  <FormattedMessage
                    defaultMessage="Action: {actionConnectorName}"
                    id="xpack.triggersActionsUI.sections.alertForm.selectAlertActionTypeEditTitle"
                    values={{
                      actionConnectorName: actionConnector.name,
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
              const updatedActions = alert.actions.filter(
                (item: AlertAction) => item.id !== actionItem.id
              );
              setAlertProperty('actions', updatedActions);
              setIsAddActionPanelOpen(
                updatedActions.filter((item: AlertAction) => item.id !== actionItem.id).length === 0
              );
              setActiveActionItem(undefined);
            }}
          />
        }
        paddingSize="l"
      >
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
                  setActionProperty('id', selectedOptions[0].id, index);
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
            messageVariables={
              alertTypesIndex ? alertTypesIndex[alert.alertTypeId].actionVariables : undefined
            }
            defaultMessage={alertTypeModel?.defaultActionMessage ?? undefined}
          />
        ) : null}
      </EuiAccordion>
    );
  };

  const getAddConnectorsForm = (actionItem: AlertAction, index: number) => {
    const actionTypeName = actionTypesIndex
      ? actionTypesIndex[actionItem.actionTypeId].name
      : actionItem.actionTypeId;
    const actionTypeRegisterd = actionTypeRegistry.get(actionItem.actionTypeId);
    if (actionTypeRegisterd === null || actionItem.group !== defaultActionGroup?.id) return null;
    return (
      <EuiAccordion
        initialIsOpen={true}
        key={index}
        id={index.toString()}
        className="euiAccordionForm"
        buttonContentClassName="euiAccordionForm__button"
        data-test-subj="alertActionAccordion"
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeRegisterd.iconClass} size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h5>
                  <FormattedMessage
                    defaultMessage="Action: {actionConnectorName}"
                    id="xpack.triggersActionsUI.sections.alertForm.selectAlertActionTypeEditTitle"
                    values={{
                      actionConnectorName: actionTypeRegisterd.actionTypeTitle,
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
              const updatedActions = alert.actions.filter(
                (item: AlertAction) => item.id !== actionItem.id
              );
              setAlertProperty('actions', updatedActions);
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

  const selectedGroupActions = (
    <Fragment>
      {alert.actions.map((actionItem: AlertAction, index: number) => {
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
    </Fragment>
  );

  const alertTypeDetails = (
    <Fragment>
      <EuiHorizontalRule />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="s" data-test-subj="selectedAlertTypeTitle">
            <h5 id="selectedAlertTypeTitle">
              <FormattedMessage
                defaultMessage="{alertType}"
                id="xpack.triggersActionsUI.sections.alertForm.selectedAlertTypeTitle"
                values={{ alertType: alertTypeModel ? alertTypeModel.name : '' }}
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        {canChangeTrigger ? (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.sections.alertForm.changeAlertTypeAriaLabel',
                {
                  defaultMessage: 'Delete',
                }
              )}
              onClick={() => {
                setAlertProperty('alertTypeId', null);
                setAlertTypeModel(null);
              }}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {AlertParamsExpressionComponent ? (
        <AlertParamsExpressionComponent
          alertParams={alert.params}
          errors={errors}
          setAlertParams={setAlertParams}
          setAlertProperty={setAlertProperty}
          alertsContext={alertsContext}
        />
      ) : null}
      <EuiSpacer size="xl" />
      {selectedGroupActions}
      {isAddActionPanelOpen ? (
        <Fragment>
          <EuiTitle size="xs">
            <h5 id="alertActionTypeTitle">
              <FormattedMessage
                defaultMessage="Actions: Select an action type"
                id="xpack.triggersActionsUI.sections.alertForm.selectAlertActionTypeTitle"
              />
            </h5>
          </EuiTitle>
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
    </Fragment>
  );

  const labelForAlertChecked = (
    <>
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.alertForm.checkFieldLabel"
        defaultMessage="Check every"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('xpack.triggersActionsUI.sections.alertForm.checkWithTooltip', {
          defaultMessage: 'This is some help text here for check alert.',
        })}
      />
    </>
  );

  const labelForAlertRenotify = (
    <>
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.alertForm.renotifyFieldLabel"
        defaultMessage="Re-notify every"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('xpack.triggersActionsUI.sections.alertForm.renotifyWithTooltip', {
          defaultMessage: 'This is some help text here for re-notify alert.',
        })}
      />
    </>
  );

  return (
    <EuiForm isInvalid={serverError !== null} error={serverError?.body.message}>
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            id="alertName"
            label={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertForm.alertNameLabel"
                defaultMessage="Name"
              />
            }
            isInvalid={errors.name.length > 0 && alert.name !== undefined}
            error={errors.name}
          >
            <EuiFieldText
              fullWidth
              isInvalid={errors.name.length > 0 && alert.name !== undefined}
              compressed
              name="name"
              data-test-subj="alertNameInput"
              value={alert.name || ''}
              onChange={e => {
                setAlertProperty('name', e.target.value);
              }}
              onBlur={() => {
                if (!alert.name) {
                  setAlertProperty('name', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.actionAdd.indexAction.indexTextFieldLabel',
              {
                defaultMessage: 'Tags (optional)',
              }
            )}
          >
            <EuiComboBox
              noSuggestions
              fullWidth
              compressed
              data-test-subj="tagsComboBox"
              selectedOptions={tagsOptions}
              onCreateOption={(searchValue: string) => {
                const newOptions = [...tagsOptions, { label: searchValue }];
                setAlertProperty(
                  'tags',
                  newOptions.map(newOption => newOption.label)
                );
              }}
              onChange={(selectedOptions: Array<{ label: string }>) => {
                setAlertProperty(
                  'tags',
                  selectedOptions.map(selectedOption => selectedOption.label)
                );
              }}
              onBlur={() => {
                if (!alert.tags) {
                  setAlertProperty('tags', []);
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiFormRow fullWidth compressed label={labelForAlertChecked}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldNumber
                  fullWidth
                  min={1}
                  compressed
                  value={alertInterval || 1}
                  name="interval"
                  data-test-subj="intervalInput"
                  onChange={e => {
                    const interval = e.target.value !== '' ? parseInt(e.target.value, 10) : null;
                    setAlertInterval(interval);
                    setScheduleProperty('interval', `${e.target.value}${alertIntervalUnit}`);
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  fullWidth
                  compressed
                  value={alertIntervalUnit}
                  options={getTimeOptions(alertInterval ?? 1)}
                  onChange={e => {
                    setAlertIntervalUnit(e.target.value);
                    setScheduleProperty('interval', `${alertInterval}${e.target.value}`);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={labelForAlertRenotify}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldNumber
                  fullWidth
                  min={1}
                  compressed
                  value={alertThrottle || ''}
                  name="throttle"
                  data-test-subj="throttleInput"
                  onChange={e => {
                    const throttle = e.target.value !== '' ? parseInt(e.target.value, 10) : null;
                    setAlertThrottle(throttle);
                    setAlertProperty('throttle', `${e.target.value}${alertThrottleUnit}`);
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  compressed
                  value={alertThrottleUnit}
                  options={getTimeOptions(alertThrottle ?? 1)}
                  onChange={e => {
                    setAlertThrottleUnit(e.target.value);
                    setAlertProperty('throttle', `${alertThrottle}${e.target.value}`);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="m" />
      {alertTypeModel ? (
        <Fragment>{alertTypeDetails}</Fragment>
      ) : (
        <Fragment>
          <EuiHorizontalRule />
          <EuiTitle size="s">
            <h5 id="alertTypeTitle">
              <FormattedMessage
                defaultMessage="Trigger: Select a trigger type"
                id="xpack.triggersActionsUI.sections.alertForm.selectAlertTypeTitle"
              />
            </h5>
          </EuiTitle>
          <EuiSpacer />
          <EuiFlexGroup gutterSize="s" wrap>
            {alertTypeNodes}
          </EuiFlexGroup>
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
            setActionProperty('id', savedAction.id, activeActionItem.index);
          }}
          actionTypeRegistry={actionTypeRegistry}
          alertTypeRegistry={alertTypeRegistry}
          http={http}
          toastNotifications={toastNotifications}
        />
      ) : null}
    </EuiForm>
  );
};
