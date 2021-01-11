/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect, useCallback, Suspense } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiTitle,
  EuiForm,
  EuiSpacer,
  EuiFieldText,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFormRow,
  EuiComboBox,
  EuiFieldNumber,
  EuiSelect,
  EuiIconTip,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiEmptyPrompt,
  EuiListGroupItem,
  EuiListGroup,
  EuiLink,
  EuiText,
  EuiNotificationBadge,
  EuiErrorBoundary,
  EuiToolTip,
  EuiCallOut,
} from '@elastic/eui';
import { capitalize, isObject } from 'lodash';
import { KibanaFeature } from '../../../../../features/public';
import {
  getDurationNumberInItsUnit,
  getDurationUnitValue,
} from '../../../../../alerts/common/parse_duration';
import { loadAlertTypes } from '../../lib/alert_api';
import { AlertReducerAction, InitialAlert } from './alert_reducer';
import {
  AlertTypeModel,
  Alert,
  IErrorObject,
  AlertAction,
  AlertTypeIndex,
  AlertType,
  ValidationResult,
  AlertTypeRegistryContract,
  ActionTypeRegistryContract,
} from '../../../types';
import { getTimeOptions } from '../../../common/lib/get_time_options';
import { ActionForm } from '../action_connector_form';
import {
  AlertActionParam,
  ALERTS_FEATURE_ID,
  RecoveredActionGroup,
  isActionGroupDisabledForActionTypeId,
} from '../../../../../alerts/common';
import { hasAllPrivilege, hasShowActionsCapability } from '../../lib/capabilities';
import { SolutionFilter } from './solution_filter';
import './alert_form.scss';
import { useKibana } from '../../../common/lib/kibana';
import { recoveredActionGroupMessage } from '../../constants';
import { getDefaultsForActionParams } from '../../lib/get_defaults_for_action_params';
import { IsEnabledResult, IsDisabledResult } from '../../lib/check_alert_type_enabled';
import { AlertNotifyWhen } from './alert_notify_when';
import { checkAlertTypeEnabled } from '../../lib/check_alert_type_enabled';
import { alertTypeCompare, alertTypeGroupCompare } from '../../lib/alert_type_compare';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../../common/constants';
import { SectionLoading } from '../../components/section_loading';

const ENTER_KEY = 13;

export function validateBaseProperties(alertObject: InitialAlert): ValidationResult {
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
  if (alertObject.schedule.interval.length < 2) {
    errors.interval.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredIntervalText', {
        defaultMessage: 'Check interval is required.',
      })
    );
  }
  if (!alertObject.alertTypeId) {
    errors.alertTypeId.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredAlertTypeIdText', {
        defaultMessage: 'Alert type is required.',
      })
    );
  }
  const emptyConnectorActions = alertObject.actions.find(
    (actionItem) => /^\d+$/.test(actionItem.id) && Object.keys(actionItem.params).length > 0
  );
  if (emptyConnectorActions !== undefined) {
    errors.actionConnectors.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredActionConnector', {
        defaultMessage: 'Action connector for {actionTypeId} is required.',
        values: { actionTypeId: emptyConnectorActions.actionTypeId },
      })
    );
  }
  return validationResult;
}

export function getAlertErrors(
  alert: Alert,
  actionTypeRegistry: ActionTypeRegistryContract,
  alertTypeModel: AlertTypeModel | null
) {
  const alertParamsErrors: IErrorObject = alertTypeModel
    ? alertTypeModel.validate(alert.params).errors
    : [];
  const alertBaseErrors = validateBaseProperties(alert).errors as IErrorObject;
  const alertErrors = {
    ...alertParamsErrors,
    ...alertBaseErrors,
  } as IErrorObject;

  const alertActionsErrors = alert.actions.reduce((prev, alertAction: AlertAction) => {
    return {
      ...prev,
      [alertAction.id]: actionTypeRegistry
        .get(alertAction.actionTypeId)
        ?.validateParams(alertAction.params).errors,
    };
  }, {}) as Record<string, IErrorObject>;
  return {
    alertParamsErrors,
    alertBaseErrors,
    alertActionsErrors,
    alertErrors,
  };
}

export const hasObjectErrors: (errors: IErrorObject) => boolean = (errors) =>
  !!Object.values(errors).find((errorList) => {
    if (isObject(errorList)) return hasObjectErrors(errorList as IErrorObject);
    return errorList.length >= 1;
  });

export function isValidAlert(
  alertObject: InitialAlert | Alert,
  validationResult: IErrorObject,
  actionsErrors: Record<string, IErrorObject>
): alertObject is Alert {
  return (
    !hasObjectErrors(validationResult) &&
    Object.keys(actionsErrors).find((actionErrorsKey) =>
      hasObjectErrors(actionsErrors[actionErrorsKey])
    ) === undefined
  );
}

function getProducerFeatureName(producer: string, kibanaFeatures: KibanaFeature[]) {
  return kibanaFeatures.find((featureItem) => featureItem.id === producer)?.name;
}

interface AlertFormProps<MetaData = Record<string, any>> {
  alert: InitialAlert;
  dispatch: React.Dispatch<AlertReducerAction>;
  errors: IErrorObject;
  alertTypeRegistry: AlertTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  operation: string;
  canChangeTrigger?: boolean; // to hide Change trigger button
  setHasActionsDisabled?: (value: boolean) => void;
  setHasActionsWithBrokenConnector?: (value: boolean) => void;
  metadata?: MetaData;
}

export const AlertForm = ({
  alert,
  canChangeTrigger = true,
  dispatch,
  errors,
  setHasActionsDisabled,
  setHasActionsWithBrokenConnector,
  operation,
  alertTypeRegistry,
  actionTypeRegistry,
  metadata,
}: AlertFormProps) => {
  const {
    http,
    notifications: { toasts },
    docLinks,
    application: { capabilities },
    kibanaFeatures,
    charts,
    data,
  } = useKibana().services;
  const canShowActions = hasShowActionsCapability(capabilities);

  const [alertTypeModel, setAlertTypeModel] = useState<AlertTypeModel | null>(null);

  const [alertInterval, setAlertInterval] = useState<number | undefined>(
    alert.schedule.interval ? getDurationNumberInItsUnit(alert.schedule.interval) : undefined
  );
  const [alertIntervalUnit, setAlertIntervalUnit] = useState<string>(
    alert.schedule.interval ? getDurationUnitValue(alert.schedule.interval) : 'm'
  );
  const [alertThrottle, setAlertThrottle] = useState<number | null>(
    alert.throttle ? getDurationNumberInItsUnit(alert.throttle) : null
  );
  const [alertThrottleUnit, setAlertThrottleUnit] = useState<string>(
    alert.throttle ? getDurationUnitValue(alert.throttle) : 'h'
  );
  const [defaultActionGroupId, setDefaultActionGroupId] = useState<string | undefined>(undefined);
  const [alertTypesIndex, setAlertTypesIndex] = useState<AlertTypeIndex | null>(null);

  const [availableAlertTypes, setAvailableAlertTypes] = useState<
    Array<{ alertTypeModel: AlertTypeModel; alertType: AlertType }>
  >([]);
  const [filteredAlertTypes, setFilteredAlertTypes] = useState<
    Array<{ alertTypeModel: AlertTypeModel; alertType: AlertType }>
  >([]);
  const [searchText, setSearchText] = useState<string | undefined>();
  const [inputText, setInputText] = useState<string | undefined>();
  const [solutions, setSolutions] = useState<Map<string, string> | undefined>(undefined);
  const [solutionsFilter, setSolutionFilter] = useState<string[]>([]);
  let hasDisabledByLicenseAlertTypes: boolean = false;

  // load alert types
  useEffect(() => {
    (async () => {
      try {
        const alertTypesResult = await loadAlertTypes({ http });
        const index: AlertTypeIndex = new Map();
        for (const alertTypeItem of alertTypesResult) {
          index.set(alertTypeItem.id, alertTypeItem);
        }
        if (alert.alertTypeId && index.has(alert.alertTypeId)) {
          setDefaultActionGroupId(index.get(alert.alertTypeId)!.defaultActionGroupId);
        }
        setAlertTypesIndex(index);

        const availableAlertTypesResult = getAvailableAlertTypes(alertTypesResult);
        setAvailableAlertTypes(availableAlertTypesResult);

        const solutionsResult = availableAlertTypesResult.reduce(
          (result: Map<string, string>, alertTypeItem) => {
            if (!result.has(alertTypeItem.alertType.producer)) {
              result.set(
                alertTypeItem.alertType.producer,
                (kibanaFeatures
                  ? getProducerFeatureName(alertTypeItem.alertType.producer, kibanaFeatures)
                  : capitalize(alertTypeItem.alertType.producer)) ??
                  capitalize(alertTypeItem.alertType.producer)
              );
            }
            return result;
          },
          new Map()
        );
        setSolutions(
          new Map([...solutionsResult.entries()].sort(([, a], [, b]) => a.localeCompare(b)))
        );
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertForm.unableToLoadAlertTypesMessage',
            { defaultMessage: 'Unable to load alert types' }
          ),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAlertTypeModel(alert.alertTypeId ? alertTypeRegistry.get(alert.alertTypeId) : null);
    if (alert.alertTypeId && alertTypesIndex && alertTypesIndex.has(alert.alertTypeId)) {
      setDefaultActionGroupId(alertTypesIndex.get(alert.alertTypeId)!.defaultActionGroupId);
    }
  }, [alert, alert.alertTypeId, alertTypesIndex, alertTypeRegistry]);

  const setAlertProperty = useCallback(
    <Key extends keyof Alert>(key: Key, value: Alert[Key] | null) => {
      dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
    },
    [dispatch]
  );

  const setActions = useCallback(
    (updatedActions: AlertAction[]) => setAlertProperty('actions', updatedActions),
    [setAlertProperty]
  );

  const setAlertParams = (key: string, value: any) => {
    dispatch({ command: { type: 'setAlertParams' }, payload: { key, value } });
  };

  const setScheduleProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setScheduleProperty' }, payload: { key, value } });
  };

  const setActionProperty = <Key extends keyof AlertAction>(
    key: Key,
    value: AlertAction[Key] | null,
    index: number
  ) => {
    dispatch({ command: { type: 'setAlertActionProperty' }, payload: { key, value, index } });
  };

  const setActionParamsProperty = useCallback(
    (key: string, value: AlertActionParam, index: number) => {
      dispatch({ command: { type: 'setAlertActionParams' }, payload: { key, value, index } });
    },
    [dispatch]
  );

  useEffect(() => {
    const searchValue = searchText ? searchText.trim().toLocaleLowerCase() : null;
    setFilteredAlertTypes(
      availableAlertTypes
        .filter((alertTypeItem) =>
          solutionsFilter.length > 0
            ? solutionsFilter.find((item) => alertTypeItem.alertType!.producer === item)
            : alertTypeItem
        )
        .filter((alertTypeItem) =>
          searchValue
            ? alertTypeItem.alertType.name.toString().toLocaleLowerCase().includes(searchValue) ||
              alertTypeItem.alertType!.producer.toLocaleLowerCase().includes(searchValue) ||
              alertTypeItem.alertTypeModel.description.toLocaleLowerCase().includes(searchValue)
            : alertTypeItem
        )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertTypeRegistry, availableAlertTypes, searchText, JSON.stringify(solutionsFilter)]);

  const getAvailableAlertTypes = (alertTypesResult: AlertType[]) =>
    alertTypeRegistry
      .list()
      .reduce(
        (
          arr: Array<{ alertType: AlertType; alertTypeModel: AlertTypeModel }>,
          alertTypeRegistryItem: AlertTypeModel
        ) => {
          const alertType = alertTypesResult.find((item) => alertTypeRegistryItem.id === item.id);
          if (alertType) {
            arr.push({
              alertType,
              alertTypeModel: alertTypeRegistryItem,
            });
          }
          return arr;
        },
        []
      )
      .filter((item) => item.alertType && hasAllPrivilege(alert, item.alertType))
      .filter((item) =>
        alert.consumer === ALERTS_FEATURE_ID
          ? !item.alertTypeModel.requiresAppContext
          : item.alertType!.producer === alert.consumer
      );
  const selectedAlertType = alert?.alertTypeId
    ? alertTypesIndex?.get(alert?.alertTypeId)
    : undefined;
  const recoveryActionGroup = selectedAlertType?.recoveryActionGroup?.id;
  const getDefaultActionParams = useCallback(
    (actionTypeId: string, actionGroupId: string): Record<string, AlertActionParam> | undefined =>
      getDefaultsForActionParams(
        actionTypeId,
        actionGroupId,
        actionGroupId === recoveryActionGroup
      ),
    [recoveryActionGroup]
  );

  const tagsOptions = alert.tags ? alert.tags.map((label: string) => ({ label })) : [];

  const isActionGroupDisabledForActionType = useCallback(
    (alertType: AlertType, actionGroupId: string, actionTypeId: string): boolean => {
      return isActionGroupDisabledForActionTypeId(
        actionGroupId === alertType?.recoveryActionGroup?.id
          ? RecoveredActionGroup.id
          : actionGroupId,
        actionTypeId
      );
    },
    []
  );

  const AlertParamsExpressionComponent = alertTypeModel
    ? alertTypeModel.alertParamsExpression
    : null;

  const alertTypesByProducer = filteredAlertTypes.reduce(
    (
      result: Record<
        string,
        Array<{
          id: string;
          name: string;
          checkEnabledResult: IsEnabledResult | IsDisabledResult;
          alertTypeItem: AlertTypeModel;
        }>
      >,
      alertTypeValue
    ) => {
      const producer = alertTypeValue.alertType.producer;
      if (producer) {
        const checkEnabledResult = checkAlertTypeEnabled(alertTypeValue.alertType);
        if (!checkEnabledResult.isEnabled) {
          hasDisabledByLicenseAlertTypes = true;
        }
        (result[producer] = result[producer] || []).push({
          name: alertTypeValue.alertType.name,
          id: alertTypeValue.alertTypeModel.id,
          checkEnabledResult,
          alertTypeItem: alertTypeValue.alertTypeModel,
        });
      }
      return result;
    },
    {}
  );

  const alertTypeNodes = Object.entries(alertTypesByProducer)
    .sort((a, b) => alertTypeGroupCompare(a, b, solutions))
    .map(([solution, items], groupIndex) => (
      <Fragment key={`group${groupIndex}`}>
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          className="triggersActionsUI__alertTypeNodeHeading"
        >
          <EuiFlexItem>
            <EuiTitle
              data-test-subj={`alertType${groupIndex}Group`}
              size="xxxs"
              textTransform="uppercase"
            >
              <EuiTextColor color="subdued">
                {(kibanaFeatures
                  ? getProducerFeatureName(solution, kibanaFeatures)
                  : capitalize(solution)) ?? capitalize(solution)}
              </EuiTextColor>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color="subdued">{items.length}</EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule size="full" margin="xs" />
        <EuiListGroup flush={true} gutterSize="m" size="l" maxWidth={false}>
          {items
            .sort((a, b) => alertTypeCompare(a, b))
            .map((item, index) => {
              const alertTypeListItemHtml = (
                <span>
                  <strong>{item.name}</strong>
                  <EuiText color="subdued" size="s">
                    <p>{item.alertTypeItem.description}</p>
                  </EuiText>
                </span>
              );
              return (
                <Fragment key={index}>
                  <EuiListGroupItem
                    data-test-subj={`${item.id}-SelectOption`}
                    color="primary"
                    label={
                      item.checkEnabledResult.isEnabled ? (
                        alertTypeListItemHtml
                      ) : (
                        <EuiToolTip
                          position="top"
                          data-test-subj={`${item.id}-disabledTooltip`}
                          content={item.checkEnabledResult.message}
                        >
                          {alertTypeListItemHtml}
                        </EuiToolTip>
                      )
                    }
                    isDisabled={!item.checkEnabledResult.isEnabled}
                    onClick={() => {
                      setAlertProperty('alertTypeId', item.id);
                      setActions([]);
                      setAlertTypeModel(item.alertTypeItem);
                      setAlertProperty('params', {});
                      if (alertTypesIndex && alertTypesIndex.has(item.id)) {
                        setDefaultActionGroupId(alertTypesIndex.get(item.id)!.defaultActionGroupId);
                      }
                    }}
                  />
                </Fragment>
              );
            })}
        </EuiListGroup>
        <EuiSpacer />
      </Fragment>
    ));

  const alertTypeDetails = (
    <Fragment>
      <EuiHorizontalRule />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="s" data-test-subj="selectedAlertTypeTitle">
            <h5 id="selectedAlertTypeTitle">
              {alert.alertTypeId && alertTypesIndex && alertTypesIndex.has(alert.alertTypeId)
                ? alertTypesIndex.get(alert.alertTypeId)!.name
                : ''}
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
                setAlertProperty('params', {});
              }}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {alertTypeModel?.description && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText color="subdued" size="s" data-test-subj="alertDescription">
              {alertTypeModel.description}&nbsp;
              {alertTypeModel?.documentationUrl && (
                <EuiLink
                  external
                  target="_blank"
                  data-test-subj="alertDocumentationLink"
                  href={
                    typeof alertTypeModel.documentationUrl === 'function'
                      ? alertTypeModel.documentationUrl(docLinks)
                      : alertTypeModel.documentationUrl
                  }
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.alertForm.documentationLabel"
                    defaultMessage="Documentation"
                  />
                </EuiLink>
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiHorizontalRule />
      {AlertParamsExpressionComponent &&
      defaultActionGroupId &&
      alert.alertTypeId &&
      selectedAlertType ? (
        <EuiErrorBoundary>
          <Suspense
            fallback={
              <SectionLoading>
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.alertForm.loadingAlertTypeParamsDescription"
                  defaultMessage="Loading alert type params…"
                />
              </SectionLoading>
            }
          >
            <AlertParamsExpressionComponent
              alertParams={alert.params}
              alertInterval={`${alertInterval ?? 1}${alertIntervalUnit}`}
              alertThrottle={`${alertThrottle ?? 1}${alertThrottleUnit}`}
              errors={errors}
              setAlertParams={setAlertParams}
              setAlertProperty={setAlertProperty}
              defaultActionGroupId={defaultActionGroupId}
              actionGroups={selectedAlertType.actionGroups}
              metadata={metadata}
              charts={charts}
              data={data}
            />
          </Suspense>
        </EuiErrorBoundary>
      ) : null}
      {canShowActions &&
      defaultActionGroupId &&
      alertTypeModel &&
      alert.alertTypeId &&
      selectedAlertType ? (
        <>
          {errors.actionConnectors.length >= 1 ? (
            <Fragment>
              <EuiSpacer />
              <EuiCallOut color="danger" size="s" title={errors.actionConnectors} />
              <EuiSpacer />
            </Fragment>
          ) : null}
          <ActionForm
            actions={alert.actions}
            setHasActionsDisabled={setHasActionsDisabled}
            setHasActionsWithBrokenConnector={setHasActionsWithBrokenConnector}
            messageVariables={selectedAlertType.actionVariables}
            defaultActionGroupId={defaultActionGroupId}
            isActionGroupDisabledForActionType={(actionGroupId: string, actionTypeId: string) =>
              isActionGroupDisabledForActionType(selectedAlertType, actionGroupId, actionTypeId)
            }
            actionGroups={selectedAlertType.actionGroups.map((actionGroup) =>
              actionGroup.id === selectedAlertType.recoveryActionGroup.id
                ? {
                    ...actionGroup,
                    omitOptionalMessageVariables: true,
                    defaultActionMessage: recoveredActionGroupMessage,
                  }
                : { ...actionGroup, defaultActionMessage: alertTypeModel?.defaultActionMessage }
            )}
            getDefaultActionParams={getDefaultActionParams}
            setActionIdByIndex={(id: string, index: number) => setActionProperty('id', id, index)}
            setActionGroupIdByIndex={(group: string, index: number) =>
              setActionProperty('group', group, index)
            }
            setActions={setActions}
            setActionParamsProperty={setActionParamsProperty}
            actionTypeRegistry={actionTypeRegistry}
          />
        </>
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
          defaultMessage: 'Define how often to evaluate the condition.',
        })}
      />
    </>
  );

  return (
    <EuiForm>
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
              autoFocus={true}
              isInvalid={errors.name.length > 0 && alert.name !== undefined}
              name="name"
              data-test-subj="alertNameInput"
              value={alert.name || ''}
              onChange={(e) => {
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
            label={i18n.translate('xpack.triggersActionsUI.sections.alertForm.tagsFieldLabel', {
              defaultMessage: 'Tags (optional)',
            })}
          >
            <EuiComboBox
              noSuggestions
              fullWidth
              data-test-subj="tagsComboBox"
              selectedOptions={tagsOptions}
              onCreateOption={(searchValue: string) => {
                const newOptions = [...tagsOptions, { label: searchValue }];
                setAlertProperty(
                  'tags',
                  newOptions.map((newOption) => newOption.label)
                );
              }}
              onChange={(selectedOptions: Array<{ label: string }>) => {
                setAlertProperty(
                  'tags',
                  selectedOptions.map((selectedOption) => selectedOption.label)
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
          <EuiFormRow
            fullWidth
            display="rowCompressed"
            label={labelForAlertChecked}
            isInvalid={errors.interval.length > 0}
            error={errors.interval}
          >
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldNumber
                  fullWidth
                  min={1}
                  isInvalid={errors.interval.length > 0}
                  value={alertInterval || ''}
                  name="interval"
                  data-test-subj="intervalInput"
                  onChange={(e) => {
                    const interval =
                      e.target.value !== '' ? parseInt(e.target.value, 10) : undefined;
                    setAlertInterval(interval);
                    setScheduleProperty('interval', `${e.target.value}${alertIntervalUnit}`);
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  fullWidth
                  value={alertIntervalUnit}
                  options={getTimeOptions(alertInterval ?? 1)}
                  onChange={(e) => {
                    setAlertIntervalUnit(e.target.value);
                    setScheduleProperty('interval', `${alertInterval}${e.target.value}`);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <AlertNotifyWhen
            alert={alert}
            throttle={alertThrottle}
            throttleUnit={alertThrottleUnit}
            onNotifyWhenChange={useCallback(
              (notifyWhen) => {
                setAlertProperty('notifyWhen', notifyWhen);
              },
              [setAlertProperty]
            )}
            onThrottleChange={useCallback(
              (throttle: number | null, throttleUnit: string) => {
                setAlertThrottle(throttle);
                setAlertThrottleUnit(throttleUnit);
                setAlertProperty('throttle', throttle ? `${throttle}${throttleUnit}` : null);
              },
              [setAlertProperty]
            )}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="m" />
      {alertTypeModel ? (
        <Fragment>{alertTypeDetails}</Fragment>
      ) : availableAlertTypes.length ? (
        <Fragment>
          <EuiHorizontalRule />
          <EuiFormRow
            fullWidth
            labelAppend={
              hasDisabledByLicenseAlertTypes && (
                <EuiTitle size="xxs">
                  <EuiLink
                    href={VIEW_LICENSE_OPTIONS_LINK}
                    target="_blank"
                    external
                    className="actActionForm__getMoreActionsLink"
                  >
                    <FormattedMessage
                      defaultMessage="Get more alert types"
                      id="xpack.triggersActionsUI.sections.actionForm.getMoreAlertTypesTitle"
                    />
                  </EuiLink>
                </EuiTitle>
              )
            }
            label={
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.alertForm.alertTypeSelectLabel"
                    defaultMessage="Select alert type"
                  />
                </h5>
              </EuiTitle>
            }
          >
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldSearch
                  fullWidth
                  data-test-subj="alertSearchField"
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyUp={(e) => {
                    if (e.keyCode === ENTER_KEY) {
                      setSearchText(inputText);
                    }
                  }}
                  placeholder={i18n.translate(
                    'xpack.triggersActionsUI.sections.alertForm.searchPlaceholderTitle',
                    { defaultMessage: 'Search' }
                  )}
                />
              </EuiFlexItem>
              {solutions ? (
                <EuiFlexItem grow={false}>
                  <SolutionFilter
                    key="solution-filter"
                    solutions={solutions}
                    onChange={(selectedSolutions: string[]) => setSolutionFilter(selectedSolutions)}
                  />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFormRow>
          <EuiSpacer />
          {errors.alertTypeId.length >= 1 && alert.alertTypeId !== undefined ? (
            <Fragment>
              <EuiSpacer />
              <EuiCallOut color="danger" size="s" title={errors.alertTypeId} />
              <EuiSpacer />
            </Fragment>
          ) : null}
          {alertTypeNodes}
        </Fragment>
      ) : alertTypesIndex ? (
        <NoAuthorizedAlertTypes operation={operation} />
      ) : (
        <SectionLoading>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertForm.loadingAlertTypesDescription"
            defaultMessage="Loading alert types…"
          />
        </SectionLoading>
      )}
    </EuiForm>
  );
};

const NoAuthorizedAlertTypes = ({ operation }: { operation: string }) => (
  <EuiEmptyPrompt
    iconType="lock"
    data-test-subj="noAuthorizedAlertTypesPrompt"
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.alertForm.error.noAuthorizedAlertTypesTitle"
          defaultMessage="You have not been authorized to {operation} any Alert types"
          values={{ operation }}
        />
      </h2>
    }
    body={
      <div>
        <p role="banner">
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertForm.error.noAuthorizedAlertTypes"
            defaultMessage="In order to {operation} an Alert you need to have been granted the appropriate privileges."
            values={{ operation }}
          />
        </p>
      </div>
    }
  />
);
