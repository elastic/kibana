/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, useMemo, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiFlyoutHeader, EuiFlyout, EuiFlyoutBody, EuiPortal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import {
  Alert,
  AlertTypeParams,
  AlertUpdates,
  AlertFlyoutCloseReason,
  IErrorObject,
  AlertAddProps,
} from '../../../types';
import { AlertForm, getAlertActionErrors, getAlertErrors, isValidAlert } from './alert_form';
import { alertReducer, InitialAlert, InitialAlertReducer } from './alert_reducer';
import { createAlert } from '../../lib/alert_api';
import { HealthCheck } from '../../components/health_check';
import { ConfirmAlertSave } from './confirm_alert_save';
import { ConfirmAlertClose } from './confirm_alert_close';
import { hasShowActionsCapability } from '../../lib/capabilities';
import AlertAddFooter from './alert_add_footer';
import { HealthContextProvider } from '../../context/health_context';
import { useKibana } from '../../../common/lib/kibana';
import { hasAlertChanged, haveAlertParamsChanged } from './has_alert_changed';
import { getAlertWithInvalidatedFields } from '../../lib/value_validators';

const AlertAdd = ({
  consumer,
  ruleTypeRegistry,
  actionTypeRegistry,
  onClose,
  canChangeTrigger,
  alertTypeId,
  initialValues,
  reloadAlerts,
  onSave,
  metadata,
}: AlertAddProps) => {
  const onSaveHandler = onSave ?? reloadAlerts;
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
  const [initialAlertParams, setInitialAlertParams] = useState<AlertTypeParams>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isConfirmAlertSaveModalOpen, setIsConfirmAlertSaveModalOpen] = useState<boolean>(false);
  const [isConfirmAlertCloseModalOpen, setIsConfirmAlertCloseModalOpen] = useState<boolean>(false);

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

  useEffect(() => {
    if (isEmpty(alert.params) && !isEmpty(initialAlertParams)) {
      // alert params are explicitly cleared when the alert type is cleared.
      // clear the "initial" params in order to capture the
      // default when a new alert type is selected
      setInitialAlertParams({});
    } else if (isEmpty(initialAlertParams)) {
      // captures the first change to the alert params,
      // when consumers set a default value for the alert params
      setInitialAlertParams(alert.params);
    }
  }, [alert.params, initialAlertParams, setInitialAlertParams]);

  const [alertActionsErrors, setAlertActionsErrors] = useState<IErrorObject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const res = await getAlertActionErrors(alert as Alert, actionTypeRegistry);
      setIsLoading(false);
      setAlertActionsErrors([...res]);
    })();
  }, [alert, actionTypeRegistry]);

  const checkForChangesAndCloseFlyout = () => {
    if (
      hasAlertChanged(alert, initialAlert, false) ||
      haveAlertParamsChanged(alert.params, initialAlertParams)
    ) {
      setIsConfirmAlertCloseModalOpen(true);
    } else {
      onClose(AlertFlyoutCloseReason.CANCELED);
    }
  };

  const saveAlertAndCloseFlyout = async () => {
    const savedAlert = await onSaveAlert();
    setIsSaving(false);
    if (savedAlert) {
      onClose(AlertFlyoutCloseReason.SAVED);
      if (onSaveHandler) {
        onSaveHandler();
      }
    }
  };

  const alertType = alert.alertTypeId ? ruleTypeRegistry.get(alert.alertTypeId) : null;
  const { alertBaseErrors, alertErrors, alertParamsErrors } = getAlertErrors(
    alert as Alert,
    alertType
  );

  // Confirm before saving if user is able to add actions but hasn't added any to this alert
  const shouldConfirmSave = canShowActions && alert.actions?.length === 0;

  async function onSaveAlert(): Promise<Alert | undefined> {
    try {
      const newAlert = await createAlert({ http, alert: alert as AlertUpdates });
      toasts.addSuccess(
        i18n.translate('xpack.triggersActionsUI.sections.alertAdd.saveSuccessNotificationText', {
          defaultMessage: 'Created rule "{ruleName}"',
          values: {
            ruleName: newAlert.name,
          },
        })
      );
      return newAlert;
    } catch (errorRes) {
      toasts.addDanger(
        errorRes.body?.message ??
          i18n.translate('xpack.triggersActionsUI.sections.alertAdd.saveErrorNotificationText', {
            defaultMessage: 'Cannot create rule.',
          })
      );
    }
  }

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={checkForChangesAndCloseFlyout}
        aria-labelledby="flyoutAlertAddTitle"
        size="m"
        maxWidth={620}
        ownFocus={false}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s" data-test-subj="addAlertFlyoutTitle">
            <h3 id="flyoutTitle">
              <FormattedMessage
                defaultMessage="Create rule"
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
                ruleTypeRegistry={ruleTypeRegistry}
                metadata={metadata}
              />
            </EuiFlyoutBody>
            <AlertAddFooter
              isSaving={isSaving}
              isFormLoading={isLoading}
              onSave={async () => {
                setIsSaving(true);
                if (isLoading || !isValidAlert(alert, alertErrors, alertActionsErrors)) {
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
              onCancel={checkForChangesAndCloseFlyout}
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
        {isConfirmAlertCloseModalOpen && (
          <ConfirmAlertClose
            onConfirm={() => {
              setIsConfirmAlertCloseModalOpen(false);
              onClose(AlertFlyoutCloseReason.CANCELED);
            }}
            onCancel={() => {
              setIsConfirmAlertCloseModalOpen(false);
            }}
          />
        )}
      </EuiFlyout>
    </EuiPortal>
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertAdd as default };
