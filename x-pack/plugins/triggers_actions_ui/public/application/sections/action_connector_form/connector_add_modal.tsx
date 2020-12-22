/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useMemo, useReducer, useState } from 'react';
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
import { ActionConnectorForm, getConnectorErrors } from './action_connector_form';
import { connectorReducer } from './connector_reducer';
import { createActionConnector } from '../../lib/action_connector_api';
import './connector_add_modal.scss';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { ActionType, ActionConnector, ActionTypeRegistryContract } from '../../../types';
import { useKibana } from '../../../common/lib/kibana';
import { getConnectorWithInvalidatedFields } from '../../lib/value_validators';

interface ConnectorAddModalProps {
  actionType: ActionType;
  onClose: () => void;
  postSaveEventHandler?: (savedAction: ActionConnector) => void;
  consumer?: string;
  actionTypeRegistry: ActionTypeRegistryContract;
}

export const ConnectorAddModal = ({
  actionType,
  onClose,
  postSaveEventHandler,
  consumer,
  actionTypeRegistry,
}: ConnectorAddModalProps) => {
  const {
    http,
    notifications: { toasts },
    application: { capabilities },
  } = useKibana().services;
  let hasErrors = false;
  const initialConnector = useMemo(
    () => ({
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    }),
    [actionType.id]
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const canSave = hasSaveActionsCapability(capabilities);

  const [{ connector }, dispatch] = useReducer(connectorReducer, { connector: initialConnector });
  const setConnector = (value: any) => {
    dispatch({ command: { type: 'setConnector' }, payload: { key: 'connector', value } });
  };
  const [serverError, setServerError] = useState<
    | {
        body: { message: string; error: string };
      }
    | undefined
  >(undefined);

  const closeModal = useCallback(() => {
    setConnector(initialConnector);
    setServerError(undefined);
    onClose();
  }, [initialConnector, onClose]);

  const actionTypeModel = actionTypeRegistry.get(actionType.id);
  const { configErrors, connectorBaseErrors, connectorErrors, secretsErrors } = getConnectorErrors(
    connector,
    actionTypeModel
  );
  hasErrors = !!Object.keys(connectorErrors).find(
    (errorKey) => connectorErrors[errorKey].length >= 1
  );

  const onActionConnectorSave = async (): Promise<ActionConnector | undefined> =>
    await createActionConnector({ http, connector })
      .then((savedConnector) => {
        if (toasts) {
          toasts.addSuccess(
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
      .catch((errorRes) => {
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
            errors={connectorErrors}
            actionTypeRegistry={actionTypeRegistry}
            consumer={consumer}
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
          {canSave ? (
            <EuiButton
              fill
              color="secondary"
              data-test-subj="saveActionButtonModal"
              type="submit"
              iconType="check"
              isLoading={isSaving}
              onClick={async () => {
                if (hasErrors) {
                  setConnector(
                    getConnectorWithInvalidatedFields(
                      connector,
                      configErrors,
                      secretsErrors,
                      connectorBaseErrors
                    )
                  );
                  return;
                }
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
          ) : null}
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
