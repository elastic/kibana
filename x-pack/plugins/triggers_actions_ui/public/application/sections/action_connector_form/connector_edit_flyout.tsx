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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiBetaBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionConnectorForm, validateBaseProperties } from './action_connector_form';
import { ActionConnectorTableItem, ActionConnector, IErrorObject } from '../../../types';
import { connectorReducer } from './connector_reducer';
import { updateActionConnector } from '../../lib/action_connector_api';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { useActionsConnectorsContext } from '../../context/actions_connectors_context';

export interface ConnectorEditProps {
  initialConnector: ActionConnectorTableItem;
  editFlyoutVisible: boolean;
  setEditFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ConnectorEditFlyout = ({
  initialConnector,
  editFlyoutVisible,
  setEditFlyoutVisibility,
}: ConnectorEditProps) => {
  let hasErrors = false;
  const {
    http,
    toastNotifications,
    capabilities,
    actionTypeRegistry,
    reloadConnectors,
  } = useActionsConnectorsContext();
  const canSave = hasSaveActionsCapability(capabilities);
  const closeFlyout = useCallback(() => setEditFlyoutVisibility(false), [setEditFlyoutVisibility]);
  const [{ connector }, dispatch] = useReducer(connectorReducer, {
    connector: { ...initialConnector, secrets: {} },
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!editFlyoutVisible) {
    return null;
  }

  const actionTypeModel = actionTypeRegistry.get(connector.actionTypeId);
  const errors = {
    ...actionTypeModel?.validateConnector(connector).errors,
    ...validateBaseProperties(connector).errors,
  } as IErrorObject;
  hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  const onActionConnectorSave = async (): Promise<ActionConnector | undefined> =>
    await updateActionConnector({ http, connector, id: connector.id })
      .then(savedConnector => {
        if (toastNotifications) {
          toastNotifications.addSuccess(
            i18n.translate(
              'xpack.triggersActionsUI.sections.editConnectorForm.updateSuccessNotificationText',
              {
                defaultMessage: "Updated '{connectorName}'",
                values: {
                  connectorName: savedConnector.name,
                },
              }
            )
          );
        }
        return savedConnector;
      })
      .catch(errorRes => {
        toastNotifications.addDanger(
          i18n.translate(
            'xpack.triggersActionsUI.sections.editConnectorForm.updateErrorNotificationText',
            {
              defaultMessage: 'Failed to update connector: {message}',
              values: {
                message: errorRes.body?.message ?? '',
              },
            }
          )
        );
        return undefined;
      });

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionAddTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {actionTypeModel ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeModel.iconClass} size="m" />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="flyoutTitle">
                <FormattedMessage
                  defaultMessage="Edit connector"
                  id="xpack.triggersActionsUI.sections.editConnectorForm.flyoutTitle"
                />
                &emsp;
                <EuiBetaBadge
                  label="Beta"
                  tooltipContent={i18n.translate(
                    'xpack.triggersActionsUI.sections.editConnectorForm.betaBadgeTooltipContent',
                    {
                      defaultMessage:
                        'This module is not GA. Please help us by reporting any bugs.',
                    }
                  )}
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ActionConnectorForm
          connector={connector}
          errors={errors}
          actionTypeName={connector.actionType}
          dispatch={dispatch}
          actionTypeRegistry={actionTypeRegistry}
          http={http}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout}>
              {i18n.translate(
                'xpack.triggersActionsUI.sections.editConnectorForm.cancelButtonLabel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {canSave && actionTypeModel ? (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color="secondary"
                data-test-subj="saveEditedActionButton"
                type="submit"
                iconType="check"
                isDisabled={hasErrors}
                isLoading={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  const savedAction = await onActionConnectorSave();
                  setIsSaving(false);
                  if (savedAction) {
                    closeFlyout();
                    if (reloadConnectors) {
                      reloadConnectors();
                    }
                  }
                }}
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.editConnectorForm.saveButtonLabel"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
