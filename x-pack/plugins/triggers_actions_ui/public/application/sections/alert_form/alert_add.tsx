/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useReducer, useState } from 'react';
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

interface AlertAddProps {
  consumer: string;
  addFlyoutVisible: boolean;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  alertTypeId?: string;
  canChangeTrigger?: boolean;
}

export const AlertAdd = ({
  consumer,
  addFlyoutVisible,
  setAddFlyoutVisibility,
  canChangeTrigger,
  alertTypeId,
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
  } as unknown) as Alert;

  const [{ alert }, dispatch] = useReducer(alertReducer, { alert: initialAlert });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const setAlert = (value: any) => {
    dispatch({ command: { type: 'setAlert' }, payload: { key: 'alert', value } });
  };

  const {
    reloadAlerts,
    http,
    toastNotifications,
    alertTypeRegistry,
    actionTypeRegistry,
  } = useAlertsContext();

  const closeFlyout = useCallback(() => {
    setAddFlyoutVisibility(false);
    setAlert(initialAlert);
  }, [initialAlert, setAddFlyoutVisibility]);

  if (!addFlyoutVisible) {
    return null;
  }

  const alertType = alert.alertTypeId ? alertTypeRegistry.get(alert.alertTypeId) : null;
  const errors = {
    ...(alertType ? alertType.validate(alert.params).errors : []),
    ...validateBaseProperties(alert).errors,
  } as IErrorObject;
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

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
  ) as Record<string, { errors: IErrorObject }>;

  const hasActionErrors = !!Object.entries(actionsErrors)
    .map(([, actionErrors]) => actionErrors)
    .find((actionErrors: { errors: IErrorObject }) => {
      return !!Object.keys(actionErrors.errors).find(
        errorKey => actionErrors.errors[errorKey].length >= 1
      );
    });

  async function onSaveAlert(): Promise<Alert | undefined> {
    try {
      const newAlert = await createAlert({ http, alert });
      if (toastNotifications) {
        toastNotifications.addSuccess(
          i18n.translate('xpack.triggersActionsUI.sections.alertAdd.saveSuccessNotificationText', {
            defaultMessage: "Saved '{alertName}'",
            values: {
              alertName: newAlert.name,
            },
          })
        );
      }
      return newAlert;
    } catch (errorRes) {
      if (toastNotifications) {
        toastNotifications.addDanger(
          i18n.translate('xpack.triggersActionsUI.sections.alertAdd.saveErrorNotificationText', {
            defaultMessage: 'Failed to save alert: {message}',
            values: {
              message: errorRes.body?.message ?? '',
            },
          })
        );
      }
    }
  }

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={closeFlyout}
        aria-labelledby="flyoutAlertAddTitle"
        size="m"
        maxWidth={620}
        ownFocus
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s" data-test-subj="addAlertFlyoutTitle">
            <h3 id="flyoutTitle">
              <FormattedMessage
                defaultMessage="Create Alert"
                id="xpack.triggersActionsUI.sections.alertAdd.flyoutTitle"
              />
              &emsp;
              <EuiBetaBadge
                label="Beta"
                tooltipContent={i18n.translate(
                  'xpack.triggersActionsUI.sections.alertAdd.betaBadgeTooltipContent',
                  {
                    defaultMessage: 'This module is not GA. Please help us by reporting any bugs.',
                  }
                )}
              />
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <AlertForm
            alert={alert}
            dispatch={dispatch}
            errors={errors}
            canChangeTrigger={canChangeTrigger}
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
                  const savedAlert = await onSaveAlert();
                  setIsSaving(false);
                  if (savedAlert) {
                    closeFlyout();
                    if (reloadAlerts) {
                      reloadAlerts();
                    }
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
      </EuiFlyout>
    </EuiPortal>
  );
};
