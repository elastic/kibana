/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect, Suspense } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
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
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { some, filter, map, fold } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import {
  getDurationNumberInItsUnit,
  getDurationUnitValue,
} from '../../../../../alerts/common/parse_duration';
import { loadAlertTypes } from '../../lib/alert_api';
import { actionVariablesFromAlertType } from '../../lib/action_variables';
import { AlertReducerAction } from './alert_reducer';
import { AlertTypeModel, Alert, IErrorObject, AlertAction, AlertTypeIndex } from '../../../types';
import { getTimeOptions } from '../../../common/lib/get_time_options';
import { useAlertsContext } from '../../context/alerts_context';
import { ActionForm } from '../action_connector_form';

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
  canChangeTrigger?: boolean; // to hide Change trigger button
  setHasActionsDisabled?: (value: boolean) => void;
}

export const AlertForm = ({
  alert,
  canChangeTrigger = true,
  dispatch,
  errors,
  setHasActionsDisabled,
}: AlertFormProps) => {
  const alertsContext = useAlertsContext();
  const {
    http,
    toastNotifications,
    alertTypeRegistry,
    actionTypeRegistry,
    docLinks,
    capabilities,
  } = alertsContext;

  const [alertTypeModel, setAlertTypeModel] = useState<AlertTypeModel | null>(
    alert.alertTypeId ? alertTypeRegistry.get(alert.alertTypeId) : null
  );

  const [alertTypesIndex, setAlertTypesIndex] = useState<AlertTypeIndex | undefined>(undefined);
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
    alert.throttle ? getDurationUnitValue(alert.throttle) : 'm'
  );
  const [defaultActionGroupId, setDefaultActionGroupId] = useState<string | undefined>(undefined);

  // load alert types
  useEffect(() => {
    (async () => {
      try {
        const alertTypes = await loadAlertTypes({ http });
        const index: AlertTypeIndex = {};
        for (const alertTypeItem of alertTypes) {
          index[alertTypeItem.id] = alertTypeItem;
        }
        if (alert.alertTypeId && index[alert.alertTypeId]) {
          setDefaultActionGroupId(index[alert.alertTypeId].defaultActionGroupId);
        }
        setAlertTypesIndex(index);
      } catch (e) {
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertForm.unableToLoadAlertTypesMessage',
            { defaultMessage: 'Unable to load alert types' }
          ),
        });
      }
    })();
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

  const setActionProperty = (key: string, value: any, index: number) => {
    dispatch({ command: { type: 'setAlertActionProperty' }, payload: { key, value, index } });
  };

  const setActionParamsProperty = (key: string, value: any, index: number) => {
    dispatch({ command: { type: 'setAlertActionParams' }, payload: { key, value, index } });
  };

  const tagsOptions = alert.tags ? alert.tags.map((label: string) => ({ label })) : [];

  const AlertParamsExpressionComponent = alertTypeModel
    ? alertTypeModel.alertParamsExpression
    : null;

  const alertTypeRegistryList =
    alert.consumer === 'alerts'
      ? alertTypeRegistry
          .list()
          .filter(
            (alertTypeRegistryItem: AlertTypeModel) => !alertTypeRegistryItem.requiresAppContext
          )
      : alertTypeRegistry
          .list()
          .filter(
            (alertTypeRegistryItem: AlertTypeModel) =>
              alertTypesIndex &&
              alertTypesIndex[alertTypeRegistryItem.id] &&
              alertTypesIndex[alertTypeRegistryItem.id].producer === alert.consumer
          );
  const alertTypeNodes = alertTypeRegistryList.map(function (item, index) {
    return (
      <EuiKeyPadMenuItem
        key={index}
        data-test-subj={`${item.id}-SelectOption`}
        label={item.name}
        onClick={() => {
          setAlertProperty('alertTypeId', item.id);
          setAlertTypeModel(item);
          setAlertProperty('params', {});
          if (alertTypesIndex && alertTypesIndex[item.id]) {
            setDefaultActionGroupId(alertTypesIndex[item.id].defaultActionGroupId);
          }
        }}
      >
        <EuiIcon size="xl" type={item.iconClass} />
      </EuiKeyPadMenuItem>
    );
  });

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
                setAlertProperty('params', {});
              }}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {AlertParamsExpressionComponent ? (
        <Suspense
          fallback={
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <AlertParamsExpressionComponent
            alertParams={alert.params}
            alertInterval={`${alertInterval ?? 1}${alertIntervalUnit}`}
            errors={errors}
            setAlertParams={setAlertParams}
            setAlertProperty={setAlertProperty}
            alertsContext={alertsContext}
          />
        </Suspense>
      ) : null}
      {defaultActionGroupId ? (
        <ActionForm
          actions={alert.actions}
          setHasActionsDisabled={setHasActionsDisabled}
          messageVariables={
            alertTypesIndex && alertTypesIndex[alert.alertTypeId]
              ? actionVariablesFromAlertType(alertTypesIndex[alert.alertTypeId]).map(
                  (av) => av.name
                )
              : undefined
          }
          defaultActionGroupId={defaultActionGroupId}
          setActionIdByIndex={(id: string, index: number) => setActionProperty('id', id, index)}
          setAlertProperty={(updatedActions: AlertAction[]) =>
            setAlertProperty('actions', updatedActions)
          }
          setActionParamsProperty={(key: string, value: any, index: number) =>
            setActionParamsProperty(key, value, index)
          }
          http={http}
          actionTypeRegistry={actionTypeRegistry}
          defaultActionMessage={alertTypeModel?.defaultActionMessage}
          toastNotifications={toastNotifications}
          docLinks={docLinks}
          capabilities={capabilities}
        />
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

  const labelForAlertRenotify = (
    <>
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.alertForm.renotifyFieldLabel"
        defaultMessage="Notify every"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('xpack.triggersActionsUI.sections.alertForm.renotifyWithTooltip', {
          defaultMessage: 'Define how often to repeat the action while the alert is active.',
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
              compressed
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
            compressed
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
                  compressed
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
                  compressed
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
                  onChange={(e) => {
                    pipe(
                      some(e.target.value.trim()),
                      filter((value) => value !== ''),
                      map((value) => parseInt(value, 10)),
                      filter((value) => !isNaN(value)),
                      fold(
                        () => {
                          // unset throttle
                          setAlertThrottle(null);
                          setAlertProperty('throttle', null);
                        },
                        (throttle) => {
                          setAlertThrottle(throttle);
                          setAlertProperty('throttle', `${throttle}${alertThrottleUnit}`);
                        }
                      )
                    );
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  compressed
                  value={alertThrottleUnit}
                  options={getTimeOptions(alertThrottle ?? 1)}
                  onChange={(e) => {
                    setAlertThrottleUnit(e.target.value);
                    if (alertThrottle) {
                      setAlertProperty('throttle', `${alertThrottle}${e.target.value}`);
                    }
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
                defaultMessage="Select a trigger type"
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
    </EuiForm>
  );
};
