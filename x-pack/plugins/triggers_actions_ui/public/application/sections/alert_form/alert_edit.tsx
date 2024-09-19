/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, useState, useEffect } from 'react';
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
  EuiLoadingSpinner,
} from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Alert, AlertFlyoutCloseReason, AlertEditProps, IErrorObject } from '../../../types';
import { AlertForm, getAlertActionErrors, getAlertErrors, isValidAlert } from './alert_form';
import { alertReducer, ConcreteAlertReducer } from './alert_reducer';
import { updateAlert } from '../../lib/alert_api';
import { HealthCheck } from '../../components/health_check';
import { HealthContextProvider } from '../../context/health_context';
import { useKibana } from '../../../common/lib/kibana';
import { ConfirmAlertClose } from './confirm_alert_close';
import { hasAlertChanged } from './has_alert_changed';
import { getAlertWithInvalidatedFields } from '../../lib/value_validators';

export const AlertEdit = ({
  initialAlert,
  onClose,
  reloadAlerts,
  onSave,
  ruleTypeRegistry,
  actionTypeRegistry,
  metadata,
}: AlertEditProps) => {
  const onSaveHandler = onSave ?? reloadAlerts;
  const [{ alert }, dispatch] = useReducer(alertReducer as ConcreteAlertReducer, {
    alert: cloneDeep(initialAlert),
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasActionsDisabled, setHasActionsDisabled] = useState<boolean>(false);
  const [hasActionsWithBrokenConnector, setHasActionsWithBrokenConnector] =
    useState<boolean>(false);
  const [isConfirmAlertCloseModalOpen, setIsConfirmAlertCloseModalOpen] = useState<boolean>(false);
  const [alertActionsErrors, setAlertActionsErrors] = useState<IErrorObject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const setAlert = (value: Alert) => {
    dispatch({ command: { type: 'setAlert' }, payload: { key: 'alert', value } });
  };

  const alertType = ruleTypeRegistry.get(alert.alertTypeId);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const res = await getAlertActionErrors(alert as Alert, actionTypeRegistry);
      setAlertActionsErrors([...res]);
      setIsLoading(false);
    })();
  }, [alert, actionTypeRegistry]);

  const { alertBaseErrors, alertErrors, alertParamsErrors } = getAlertErrors(
    alert as Alert,
    alertType
  );

  const checkForChangesAndCloseFlyout = () => {
    if (hasAlertChanged(alert, initialAlert, true)) {
      setIsConfirmAlertCloseModalOpen(true);
    } else {
      onClose(AlertFlyoutCloseReason.CANCELED);
    }
  };

  async function onSaveAlert(): Promise<Alert | undefined> {
    try {
      if (
        !isLoading &&
        isValidAlert(alert, alertErrors, alertActionsErrors) &&
        !hasActionsWithBrokenConnector
      ) {
        const newAlert = await updateAlert({ http, alert, id: alert.id });
        toasts.addSuccess(
          i18n.translate('xpack.triggersActionsUI.sections.alertEdit.saveSuccessNotificationText', {
            defaultMessage: "Updated '{ruleName}'",
            values: {
              ruleName: newAlert.name,
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
            defaultMessage: 'Cannot update rule.',
          })
      );
    }
  }

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={checkForChangesAndCloseFlyout}
        aria-labelledby="flyoutAlertEditTitle"
        size="m"
        maxWidth={620}
        ownFocus={false}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s" data-test-subj="editAlertFlyoutTitle">
            <h3 id="flyoutTitle">
              <FormattedMessage
                defaultMessage="Edit rule"
                id="xpack.triggersActionsUI.sections.alertEdit.flyoutTitle"
              />
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <HealthContextProvider>
          <HealthCheck inFlyout={true} waitForCheck={true}>
            <EuiFlyoutBody>
              {hasActionsDisabled && (
                <>
                  <EuiCallOut
                    size="s"
                    color="danger"
                    iconType="alert"
                    data-test-subj="hasActionsDisabled"
                    title={i18n.translate(
                      'xpack.triggersActionsUI.sections.alertEdit.disabledActionsWarningTitle',
                      { defaultMessage: 'This rule has actions that are disabled' }
                    )}
                  />
                  <EuiSpacer />
                </>
              )}
              <AlertForm
                alert={alert}
                dispatch={dispatch}
                errors={alertErrors}
                actionTypeRegistry={actionTypeRegistry}
                ruleTypeRegistry={ruleTypeRegistry}
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
                    onClick={() => checkForChangesAndCloseFlyout()}
                  >
                    {i18n.translate(
                      'xpack.triggersActionsUI.sections.alertEdit.cancelButtonLabel',
                      {
                        defaultMessage: 'Cancel',
                      }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                {isLoading ? (
                  <EuiFlexItem grow={false}>
                    <EuiSpacer size="s" />
                    <EuiLoadingSpinner size="l" />
                  </EuiFlexItem>
                ) : (
                  <></>
                )}
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
                        onClose(AlertFlyoutCloseReason.SAVED);
                        if (onSaveHandler) {
                          onSaveHandler();
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
export { AlertEdit as default };
