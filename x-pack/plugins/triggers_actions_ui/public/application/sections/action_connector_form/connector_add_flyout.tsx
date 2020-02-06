/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState, Fragment, useReducer } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useActionsConnectorsContext } from '../../context/actions_connectors_context';
import { ActionTypeMenu } from './action_type_menu';
import { ActionConnectorForm, validateBaseProperties } from './action_connector_form';
import { ActionType, ActionConnector, IErrorObject } from '../../../types';
import { useAppDependencies } from '../../app_context';
import { connectorReducer } from './connector_reducer';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { createActionConnector } from '../../lib/action_connector_api';

export const ConnectorAddFlyout = () => {
  let hasErrors = false;
  const { http, toastNotifications, capabilities, actionTypeRegistry } = useAppDependencies();
  const [actionType, setActionType] = useState<ActionType | undefined>(undefined);

  // hooks
  const initialConnector = {
    actionTypeId: actionType?.id ?? '',
    config: {},
    secrets: {},
  } as ActionConnector;
  const [{ connector }, dispatch] = useReducer(connectorReducer, { connector: initialConnector });
  const setActionProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };
  const setConnector = (value: any) => {
    dispatch({ command: { type: 'setConnector' }, payload: { key: 'connector', value } });
  };

  const {
    addFlyoutVisible,
    setAddFlyoutVisibility,
    reloadConnectors,
  } = useActionsConnectorsContext();
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const closeFlyout = useCallback(() => {
    setAddFlyoutVisibility(false);
    setActionType(undefined);
    setConnector(initialConnector);
  }, [setAddFlyoutVisibility, initialConnector]);

  const [serverError, setServerError] = useState<{
    body: { message: string; error: string };
  } | null>(null);
  const canSave = hasSaveActionsCapability(capabilities);

  if (!addFlyoutVisible) {
    return null;
  }

  function onActionTypeChange(newActionType: ActionType) {
    setActionType(newActionType);
    setActionProperty('actionTypeId', newActionType.id);
  }

  let currentForm;
  let actionTypeModel;
  if (!actionType) {
    currentForm = (
      <ActionTypeMenu
        onActionTypeChange={onActionTypeChange}
        actionTypeRegistry={actionTypeRegistry}
      />
    );
  } else {
    actionTypeModel = actionTypeRegistry.get(actionType.id);

    const errors = {
      ...actionTypeModel?.validateConnector(connector).errors,
      ...validateBaseProperties(connector).errors,
    } as IErrorObject;
    hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

    currentForm = (
      <ActionConnectorForm
        actionTypeName={actionType.name}
        connector={connector}
        dispatch={dispatch}
        serverError={serverError}
        errors={errors}
        actionTypeRegistry={actionTypeRegistry}
      />
    );
  }

  const onActionConnectorSave = async (): Promise<ActionConnector | undefined> =>
    await createActionConnector({ http, connector })
      .then(savedConnector => {
        toastNotifications.addSuccess(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addConnectorForm.updateSuccessNotificationText',
            {
              defaultMessage: "Created '{connectorName}'",
              values: {
                connectorName: savedConnector.name,
              },
            }
          )
        );
        return savedConnector;
      })
      .catch(errorRes => {
        setServerError(errorRes);
        return undefined;
      });

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionAddTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="m" alignItems="center">
          {actionTypeModel && actionTypeModel.iconClass ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeModel.iconClass} size="xl" />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            {actionTypeModel && actionType ? (
              <Fragment>
                <EuiTitle size="s">
                  <h3 id="flyoutTitle">
                    <FormattedMessage
                      defaultMessage="{actionTypeName} connector"
                      id="xpack.triggersActionsUI.sections.addConnectorForm.flyoutTitle"
                      values={{
                        actionTypeName: actionType.name,
                      }}
                    />
                  </h3>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  {actionTypeModel.selectMessage}
                </EuiText>
              </Fragment>
            ) : (
              <EuiTitle size="s">
                <h3 id="selectConnectorFlyoutTitle">
                  <FormattedMessage
                    defaultMessage="Select a connector"
                    id="xpack.triggersActionsUI.sections.addConnectorForm.selectConnectorFlyoutTitle"
                  />
                </h3>
              </EuiTitle>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{currentForm}</EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout}>
              {i18n.translate(
                'xpack.triggersActionsUI.sections.actionConnectorAdd.cancelButtonLabel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {canSave && actionTypeModel && actionType ? (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color="secondary"
                data-test-subj="saveNewActionButton"
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
                    reloadConnectors();
                  }
                }}
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.actionConnectorAdd.saveButtonLabel"
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
