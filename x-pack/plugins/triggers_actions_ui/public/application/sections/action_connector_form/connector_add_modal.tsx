/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useReducer, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiFlexItem, EuiIcon, EuiFlexGroup } from '@elastic/eui';
import {
  EuiModal,
  EuiButton,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
} from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HttpSetup, ToastsApi } from 'kibana/public';
import { ActionConnectorForm, validateBaseProperties } from './action_connector_form';
import {
  ActionType,
  ActionConnector,
  IErrorObject,
  AlertTypeModel,
  ActionTypeModel,
} from '../../../types';
import { connectorReducer } from './connector_reducer';
import { createActionConnector } from '../../lib/action_connector_api';
import { TypeRegistry } from '../../type_registry';

interface ConnectorAddModalProps {
  actionType: ActionType;
  addModalVisible: boolean;
  setAddModalVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  postSaveEventHandler?: (savedAction: ActionConnector) => void;
  http: HttpSetup;
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  toastNotifications?: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
}

export const ConnectorAddModal = ({
  actionType,
  addModalVisible,
  setAddModalVisibility,
  postSaveEventHandler,
  http,
  toastNotifications,
  actionTypeRegistry,
}: ConnectorAddModalProps) => {
  let hasErrors = false;
  const initialConnector = {
    actionTypeId: actionType.id,
    config: {},
    secrets: {},
  } as ActionConnector;
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [{ connector }, dispatch] = useReducer(connectorReducer, { connector: initialConnector });
  const setConnector = (value: any) => {
    dispatch({ command: { type: 'setConnector' }, payload: { key: 'connector', value } });
  };
  const [serverError, setServerError] = useState<{
    body: { message: string; error: string };
  } | null>(null);

  const closeModal = useCallback(() => {
    setAddModalVisibility(false);
    setConnector(initialConnector);
    setServerError(null);
  }, [initialConnector, setAddModalVisibility]);

  if (!addModalVisible) {
    return null;
  }
  const actionTypeModel = actionTypeRegistry.get(actionType.id);
  const errors = {
    ...actionTypeModel?.validateConnector(connector).errors,
    ...validateBaseProperties(connector).errors,
  } as IErrorObject;
  hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  const onActionConnectorSave = async (): Promise<ActionConnector | undefined> =>
    await createActionConnector({ http, connector })
      .then(savedConnector => {
        if (toastNotifications) {
          toastNotifications.addSuccess(
            i18n.translate(
              'xpack.triggersActionsUI.sections.addModalConnectorForm.updateSuccessNotificationText',
              {
                defaultMessage: "Created '{connectorName}'",
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
        setServerError(errorRes);
        return undefined;
      });

  return (
    <EuiOverlayMask className="actConnectorModal">
      <EuiModal onClose={closeModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <EuiFlexGroup gutterSize="m" alignItems="center">
              {actionTypeModel && actionTypeModel.iconClass ? (
                <EuiFlexItem grow={false}>
                  <EuiIcon type={actionTypeModel.iconClass} size="xl" />
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3 id="flyoutTitle">
                    <FormattedMessage
                      defaultMessage="{actionTypeName} connector"
                      id="xpack.triggersActionsUI.sections.addModalConnectorForm.flyoutTitle"
                      values={{
                        actionTypeName: actionType.name,
                      }}
                    />
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <ActionConnectorForm
            connector={connector}
            actionTypeName={actionType.name}
            dispatch={dispatch}
            serverError={serverError}
            errors={errors}
            actionTypeRegistry={actionTypeRegistry}
          />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={closeModal}>
            {i18n.translate(
              'xpack.triggersActionsUI.sections.addModalConnectorForm.cancelButtonLabel',
              {
                defaultMessage: 'Cancel',
              }
            )}
          </EuiButtonEmpty>

          <EuiButton
            fill
            color="secondary"
            data-test-subj="saveActionButtonModal"
            type="submit"
            iconType="check"
            isDisabled={hasErrors}
            isLoading={isSaving}
            onClick={async () => {
              setIsSaving(true);
              const savedAction = await onActionConnectorSave();
              setIsSaving(false);
              if (savedAction) {
                if (postSaveEventHandler) {
                  postSaveEventHandler(savedAction);
                }
                closeModal();
              }
            }}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.addModalConnectorForm.saveButtonLabel"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
