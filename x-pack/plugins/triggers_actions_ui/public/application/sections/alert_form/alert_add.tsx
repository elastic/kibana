/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useReducer, useState, useEffect } from 'react';
import { isObject } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutBody,
  EuiPortal,
  EuiBetaBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAlertsContext } from '../../context/alerts_context';
import { Alert, AlertAction, IErrorObject } from '../../../types';
import { AlertForm, validateBaseProperties } from './alert_form';
import { alertReducer } from './alert_reducer';
import { createAlert } from '../../lib/alert_api';
import { HealthCheck } from '../../components/health_check';
import { PLUGIN } from '../../constants/plugin';
import { ConfirmAlertSave } from './confirm_alert_save';
import { hasShowActionsCapability } from '../../lib/capabilities';

interface AlertAddProps {
  consumer: string;
  addFlyoutVisible: boolean;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  alertTypeId?: string;
  canChangeTrigger?: boolean;
  initialValues?: Partial<Alert>;
}

export const AlertAdd = ({
  consumer,
  addFlyoutVisible,
  setAddFlyoutVisibility,
  canChangeTrigger,
  alertTypeId,
  initialValues,
}: AlertAddProps) => {
  const initialAlert = ({
    params: {},
    consumer,
    alertTypeId,
    schedule: {
      interval: '1m',
    },
    actions: [],
    tags: [],
    ...(initialValues ? initialValues : {}),
  } as unknown) as Alert;

  const [{ alert }, dispatch] = useReducer(alertReducer, { alert: initialAlert });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isConfirmAlertSaveModalOpen, setIsConfirmAlertSaveModalOpen] = useState<boolean>(false);

  const setAlert = (value: any) => {
    dispatch({ command: { type: 'setAlert' }, payload: { key: 'alert', value } });
  };
  const setAlertProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const {
    reloadAlerts,
    http,
    toastNotifications,
    alertTypeRegistry,
    actionTypeRegistry,
    docLinks,
    capabilities,
  } = useAlertsContext();

  const canShowActions = hasShowActionsCapability(capabilities);

  useEffect(() => {
    setAlertProperty('alertTypeId', alertTypeId);
  }, [alertTypeId]);

  const closeFlyout = useCallback(() => {
    setAddFlyoutVisibility(false);
    setAlert(initialAlert);
  }, [initialAlert, setAddFlyoutVisibility]);

  const saveAlertAndCloseFlyout = async () => {
    const savedAlert = await onSaveAlert();
    setIsSaving(false);
    if (savedAlert) {
      closeFlyout();
      if (reloadAlerts) {
        reloadAlerts();
      }
    }
  };

  if (!addFlyoutVisible) {
    return null;
  }

  const alertType = alert.alertTypeId ? alertTypeRegistry.get(alert.alertTypeId) : null;
  const errors = {
    ...(alertType ? alertType.validate(alert.params).errors : []),
    ...validateBaseProperties(alert).errors,
  } as IErrorObject;
  const hasErrors = parseErrors(errors);

  const actionsErrors: Array<{
    errors: IErrorObject;
  }> = alert.actions.map((alertAction: AlertAction) =>
    actionTypeRegistry.get(alertAction.actionTypeId)?.validateParams(alertAction.params)
  );

  const hasActionErrors =
    actionsErrors.find(
      (errorObj: { errors: IErrorObject }) =>
        errorObj &&
        !!Object.keys(errorObj.errors).find((errorKey) => errorObj.errors[errorKey].length >= 1)
    ) !== undefined;

  // Confirm before saving if user is able to add actions but hasn't added any to this alert
  const shouldConfirmSave = canShowActions && alert.actions?.length === 0;

  async function onSaveAlert(): Promise<Alert | undefined> {
    try {
      const newAlert = await createAlert({ http, alert });
      toastNotifications.addSuccess(
        i18n.translate('xpack.triggersActionsUI.sections.alertAdd.saveSuccessNotificationText', {
          defaultMessage: "Saved '{alertName}'",
          values: {
            alertName: newAlert.name,
          },
        })
      );
      return newAlert;
    } catch (errorRes) {
      toastNotifications.addDanger(
        errorRes.body?.message ??
          i18n.translate('xpack.triggersActionsUI.sections.alertAdd.saveErrorNotificationText', {
            defaultMessage: 'Cannot create alert.',
          })
      );
    }
  }

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={closeFlyout}
        aria-labelledby="flyoutAlertAddTitle"
        size="m"
        maxWidth={620}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s" data-test-subj="addAlertFlyoutTitle">
            <h3 id="flyoutTitle">
              <FormattedMessage
                defaultMessage="Create alert"
                id="xpack.triggersActionsUI.sections.alertAdd.flyoutTitle"
              />
              &emsp;
              <EuiBetaBadge
                label="Beta"
                tooltipContent={i18n.translate(
                  'xpack.triggersActionsUI.sections.alertAdd.betaBadgeTooltipContent',
                  {
                    defaultMessage:
                      '{pluginName} is in beta and is subject to change. The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features.',
                    values: {
                      pluginName: PLUGIN.getI18nName(i18n),
                    },
                  }
                )}
              />
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <HealthCheck docLinks={docLinks} http={http} inFlyout={true}>
          <EuiFlyoutBody>
            <AlertForm
              alert={alert}
              dispatch={dispatch}
              errors={errors}
              canChangeTrigger={canChangeTrigger}
              operation={i18n.translate('xpack.triggersActionsUI.sections.alertAdd.operationName', {
                defaultMessage: 'create',
              })}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty data-test-subj="cancelSaveAlertButton" onClick={closeFlyout}>
                  {i18n.translate('xpack.triggersActionsUI.sections.alertAdd.cancelButtonLabel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="secondary"
                  data-test-subj="saveAlertButton"
                  type="submit"
                  iconType="check"
                  isDisabled={hasErrors || hasActionErrors}
                  isLoading={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    if (shouldConfirmSave) {
                      setIsConfirmAlertSaveModalOpen(true);
                    } else {
                      await saveAlertAndCloseFlyout();
                    }
                  }}
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.alertAdd.saveButtonLabel"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </HealthCheck>
        {isConfirmAlertSaveModalOpen && (
          <ConfirmAlertSave
            onConfirm={async () => {
              setIsConfirmAlertSaveModalOpen(false);
              await saveAlertAndCloseFlyout();
            }}
            onCancel={() => {
              setIsSaving(false);
              setIsConfirmAlertSaveModalOpen(false);
            }}
          />
        )}
      </EuiFlyout>
    </EuiPortal>
  );
};

const parseErrors: (errors: IErrorObject) => boolean = (errors) =>
  !!Object.values(errors).find((errorList) => {
    if (isObject(errorList)) return parseErrors(errorList as IErrorObject);
    return errorList.length >= 1;
  });

// eslint-disable-next-line import/no-default-export
export { AlertAdd as default };
