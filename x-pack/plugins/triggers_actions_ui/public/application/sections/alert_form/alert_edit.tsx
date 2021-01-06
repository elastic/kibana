/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useReducer, useState } from 'react';
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
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionTypeRegistryContract, Alert, AlertTypeRegistryContract } from '../../../types';
import { AlertForm, getAlertErrors, isValidAlert } from './alert_form';
import { alertReducer, ConcreteAlertReducer } from './alert_reducer';
import { updateAlert } from '../../lib/alert_api';
import { HealthCheck } from '../../components/health_check';
import { HealthContextProvider } from '../../context/health_context';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertWithInvalidatedFields } from '../../lib/value_validators';

export interface AlertEditProps<MetaData = Record<string, any>> {
  initialAlert: Alert;
  alertTypeRegistry: AlertTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose(): void;
  reloadAlerts?: () => Promise<void>;
  metadata?: MetaData;
}

export const AlertEdit = ({
  initialAlert,
  onClose,
  reloadAlerts,
  alertTypeRegistry,
  actionTypeRegistry,
  metadata,
}: AlertEditProps) => {
  const [{ alert }, dispatch] = useReducer(alertReducer as ConcreteAlertReducer, {
    alert: initialAlert,
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasActionsDisabled, setHasActionsDisabled] = useState<boolean>(false);
  const [hasActionsWithBrokenConnector, setHasActionsWithBrokenConnector] = useState<boolean>(
    false
  );

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const setAlert = (value: Alert) => {
    dispatch({ command: { type: 'setAlert' }, payload: { key: 'alert', value } });
  };

  const alertType = alertTypeRegistry.get(alert.alertTypeId);

  const { alertActionsErrors, alertBaseErrors, alertErrors, alertParamsErrors } = getAlertErrors(
    alert as Alert,
    actionTypeRegistry,
    alertType
  );

  async function onSaveAlert(): Promise<Alert | undefined> {
    try {
      if (isValidAlert(alert, alertErrors, alertActionsErrors) && !hasActionsWithBrokenConnector) {
        const newAlert = await updateAlert({ http, alert, id: alert.id });
        toasts.addSuccess(
          i18n.translate('xpack.triggersActionsUI.sections.alertEdit.saveSuccessNotificationText', {
            defaultMessage: "Updated '{alertName}'",
            values: {
              alertName: newAlert.name,
            },
          })
        );
        return newAlert;
      } else {
        setAlert(
          getAlertWithInvalidatedFields(
            alert as Alert,
            alertParamsErrors,
            alertBaseErrors,
            alertActionsErrors
          )
        );
      }
    } catch (errorRes) {
      toasts.addDanger(
        errorRes.body?.message ??
          i18n.translate('xpack.triggersActionsUI.sections.alertEdit.saveErrorNotificationText', {
            defaultMessage: 'Cannot update alert.',
          })
      );
    }
  }

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={() => onClose()}
        aria-labelledby="flyoutAlertEditTitle"
        size="m"
        maxWidth={620}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s" data-test-subj="editAlertFlyoutTitle">
            <h3 id="flyoutTitle">
              <FormattedMessage
                defaultMessage="Edit alert"
                id="xpack.triggersActionsUI.sections.alertEdit.flyoutTitle"
              />
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <HealthContextProvider>
          <HealthCheck inFlyout={true} waitForCheck={true}>
            <EuiFlyoutBody>
              {hasActionsDisabled && (
                <Fragment>
                  <EuiCallOut
                    size="s"
                    color="danger"
                    iconType="alert"
                    data-test-subj="hasActionsDisabled"
                    title={i18n.translate(
                      'xpack.triggersActionsUI.sections.alertEdit.disabledActionsWarningTitle',
                      { defaultMessage: 'This alert has actions that are disabled' }
                    )}
                  />
                  <EuiSpacer />
                </Fragment>
              )}
              <AlertForm
                alert={alert}
                dispatch={dispatch}
                errors={alertErrors}
                actionTypeRegistry={actionTypeRegistry}
                alertTypeRegistry={alertTypeRegistry}
                canChangeTrigger={false}
                setHasActionsDisabled={setHasActionsDisabled}
                setHasActionsWithBrokenConnector={setHasActionsWithBrokenConnector}
                operation="i18n.translate('xpack.triggersActionsUI.sections.alertEdit.operationName', {
                  defaultMessage: 'edit',
                })"
                metadata={metadata}
              />
            </EuiFlyoutBody>
            <EuiFlyoutFooter>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="cancelSaveEditedAlertButton"
                    onClick={() => onClose()}
                  >
                    {i18n.translate(
                      'xpack.triggersActionsUI.sections.alertEdit.cancelButtonLabel',
                      {
                        defaultMessage: 'Cancel',
                      }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color="secondary"
                    data-test-subj="saveEditedAlertButton"
                    type="submit"
                    iconType="check"
                    isLoading={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      const savedAlert = await onSaveAlert();
                      setIsSaving(false);
                      if (savedAlert) {
                        onClose();
                        if (reloadAlerts) {
                          reloadAlerts();
                        }
                      }
                    }}
                  >
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.alertEdit.saveButtonLabel"
                      defaultMessage="Save"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </HealthCheck>
        </HealthContextProvider>
      </EuiFlyout>
    </EuiPortal>
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertEdit as default };
