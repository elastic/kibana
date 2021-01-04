/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useReducer, useMemo, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiFlyoutHeader, EuiFlyout, EuiFlyoutBody, EuiPortal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeRegistryContract,
  Alert,
  AlertTypeRegistryContract,
  AlertUpdates,
} from '../../../types';
import { AlertForm, getAlertErrors, isValidAlert } from './alert_form';
import { alertReducer, InitialAlert, InitialAlertReducer } from './alert_reducer';
import { createAlert } from '../../lib/alert_api';
import { HealthCheck } from '../../components/health_check';
import { ConfirmAlertSave } from './confirm_alert_save';
import { hasShowActionsCapability } from '../../lib/capabilities';
import AlertAddFooter from './alert_add_footer';
import { HealthContextProvider } from '../../context/health_context';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertWithInvalidatedFields } from '../../lib/value_validators';

export interface AlertAddProps<MetaData = Record<string, any>> {
  consumer: string;
  alertTypeRegistry: AlertTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: () => void;
  alertTypeId?: string;
  canChangeTrigger?: boolean;
  initialValues?: Partial<Alert>;
  reloadAlerts?: () => Promise<void>;
  metadata?: MetaData;
}

const AlertAdd = ({
  consumer,
  alertTypeRegistry,
  actionTypeRegistry,
  onClose,
  canChangeTrigger,
  alertTypeId,
  initialValues,
  reloadAlerts,
  metadata,
}: AlertAddProps) => {
  const initialAlert: InitialAlert = useMemo(
    () => ({
      params: {},
      consumer,
      alertTypeId,
      schedule: {
        interval: '1m',
      },
      actions: [],
      tags: [],
      notifyWhen: 'onActionGroupChange',
      ...(initialValues ? initialValues : {}),
    }),
    [alertTypeId, consumer, initialValues]
  );

  const [{ alert }, dispatch] = useReducer(alertReducer as InitialAlertReducer, {
    alert: initialAlert,
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isConfirmAlertSaveModalOpen, setIsConfirmAlertSaveModalOpen] = useState<boolean>(false);

  const setAlert = (value: InitialAlert) => {
    dispatch({ command: { type: 'setAlert' }, payload: { key: 'alert', value } });
  };

  const setAlertProperty = <Key extends keyof Alert>(key: Key, value: Alert[Key] | null) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const {
    http,
    notifications: { toasts },
    application: { capabilities },
  } = useKibana().services;

  const canShowActions = hasShowActionsCapability(capabilities);

  useEffect(() => {
    if (alertTypeId) {
      setAlertProperty('alertTypeId', alertTypeId);
    }
  }, [alertTypeId]);

  const closeFlyout = useCallback(() => {
    setAlert(initialAlert);
    onClose();
  }, [initialAlert, onClose]);

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

  const alertType = alert.alertTypeId ? alertTypeRegistry.get(alert.alertTypeId) : null;
  const { alertActionsErrors, alertBaseErrors, alertErrors, alertParamsErrors } = getAlertErrors(
    alert as Alert,
    actionTypeRegistry,
    alertType
  );

  // Confirm before saving if user is able to add actions but hasn't added any to this alert
  const shouldConfirmSave = canShowActions && alert.actions?.length === 0;

  async function onSaveAlert(): Promise<Alert | undefined> {
    try {
      const newAlert = await createAlert({ http, alert: alert as AlertUpdates });
      toasts.addSuccess(
        i18n.translate('xpack.triggersActionsUI.sections.alertAdd.saveSuccessNotificationText', {
          defaultMessage: 'Created alert "{alertName}"',
          values: {
            alertName: newAlert.name,
          },
        })
      );
      return newAlert;
    } catch (errorRes) {
      toasts.addDanger(
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
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <HealthContextProvider>
          <HealthCheck inFlyout={true} waitForCheck={false}>
            <EuiFlyoutBody>
              <AlertForm
                alert={alert}
                dispatch={dispatch}
                errors={alertErrors}
                canChangeTrigger={canChangeTrigger}
                operation={i18n.translate(
                  'xpack.triggersActionsUI.sections.alertAdd.operationName',
                  {
                    defaultMessage: 'create',
                  }
                )}
                actionTypeRegistry={actionTypeRegistry}
                alertTypeRegistry={alertTypeRegistry}
                metadata={metadata}
              />
            </EuiFlyoutBody>
            <AlertAddFooter
              isSaving={isSaving}
              onSave={async () => {
                setIsSaving(true);
                if (!isValidAlert(alert, alertErrors, alertActionsErrors)) {
                  setAlert(
                    getAlertWithInvalidatedFields(
                      alert as Alert,
                      alertParamsErrors,
                      alertBaseErrors,
                      alertActionsErrors
                    )
                  );
                  setIsSaving(false);
                  return;
                }
                if (shouldConfirmSave) {
                  setIsConfirmAlertSaveModalOpen(true);
                } else {
                  await saveAlertAndCloseFlyout();
                }
              }}
              onCancel={closeFlyout}
            />
          </HealthCheck>
        </HealthContextProvider>
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

// eslint-disable-next-line import/no-default-export
export { AlertAdd as default };
