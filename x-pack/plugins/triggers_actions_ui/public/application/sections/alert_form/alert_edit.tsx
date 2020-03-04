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
import { updateAlert } from '../../lib/alert_api';

interface AlertEditProps {
  initialAlert: Alert;
  editFlyoutVisible: boolean;
  setEditFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AlertEdit = ({
  initialAlert,
  editFlyoutVisible,
  setEditFlyoutVisibility,
}: AlertEditProps) => {
  const [{ alert }, dispatch] = useReducer(alertReducer, { alert: initialAlert });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const {
    reloadAlerts,
    http,
    toastNotifications,
    alertTypeRegistry,
    actionTypeRegistry,
  } = useAlertsContext();

  const closeFlyout = useCallback(() => {
    setEditFlyoutVisibility(false);
    setServerError(null);
  }, [setEditFlyoutVisibility]);

  const [serverError, setServerError] = useState<{
    body: { message: string; error: string };
  } | null>(null);

  if (!editFlyoutVisible) {
    return null;
  }

  const alertType = alertTypeRegistry.get(alert.alertTypeId);

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
      const newAlert = await updateAlert({ http, alert, id: alert.id });
      if (toastNotifications) {
        toastNotifications.addSuccess(
          i18n.translate('xpack.triggersActionsUI.sections.alertEdit.saveSuccessNotificationText', {
            defaultMessage: "Updated '{alertName}'",
            values: {
              alertName: newAlert.name,
            },
          })
        );
      }
      return newAlert;
    } catch (errorRes) {
      setServerError(errorRes);
    }
  }

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={closeFlyout}
        aria-labelledby="flyoutAlertEditTitle"
        size="m"
        maxWidth={620}
        ownFocus
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s" data-test-subj="editAlertFlyoutTitle">
            <h3 id="flyoutTitle">
              <FormattedMessage
                defaultMessage="Edit Alert"
                id="xpack.triggersActionsUI.sections.alertEdit.flyoutTitle"
              />
              &emsp;
              <EuiBetaBadge
                label="Beta"
                tooltipContent={i18n.translate(
                  'xpack.triggersActionsUI.sections.alertEdit.betaBadgeTooltipContent',
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
            serverError={serverError}
            canChangeTrigger={false}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty data-test-subj="cancelSaveEditedAlertButton" onClick={closeFlyout}>
                {i18n.translate('xpack.triggersActionsUI.sections.alertEdit.cancelButtonLabel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color="secondary"
                data-test-subj="saveEditedAlertButton"
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
                  id="xpack.triggersActionsUI.sections.alertEdit.saveButtonLabel"
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
