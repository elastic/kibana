/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiModal,
  EuiButton,
  EuiButtonEmpty,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiTitle,
  EuiFlexItem,
  EuiIcon,
  EuiFlexGroup,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionConnectorForm, getConnectorErrors } from './action_connector_form';
import { createConnectorReducer, InitialConnector, ConnectorReducer } from './connector_reducer';
import { createActionConnector } from '../../lib/action_connector_api';
import './connector_add_modal.scss';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import {
  ActionType,
  ActionConnector,
  ActionTypeRegistryContract,
  UserConfiguredActionConnector,
  IErrorObject,
  ActionConnectorFieldsCallbacks,
} from '../../../types';
import { useKibana } from '../../../common/lib/kibana';
import { getConnectorWithInvalidatedFields } from '../../lib/value_validators';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ConnectorAddModalProps = {
  actionType: ActionType;
  onClose: () => void;
  postSaveEventHandler?: (savedAction: ActionConnector) => void;
  consumer?: string;
  actionTypeRegistry: ActionTypeRegistryContract;
};

const ConnectorAddModal = ({
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
  const [hasErrors, setHasErrors] = useState<boolean>(true);
  const initialConnector: InitialConnector<
    Record<string, unknown>,
    Record<string, unknown>
  > = useMemo(
    () => ({
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    }),
    [actionType.id]
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const canSave = hasSaveActionsCapability(capabilities);

  const reducer: ConnectorReducer<
    Record<string, unknown>,
    Record<string, unknown>
  > = createConnectorReducer<Record<string, unknown>, Record<string, unknown>>();
  const [{ connector }, dispatch] = useReducer(reducer, {
    connector: initialConnector as UserConfiguredActionConnector<
      Record<string, unknown>,
      Record<string, unknown>
    >,
  });
  const [errors, setErrors] = useState<{
    configErrors: IErrorObject;
    connectorBaseErrors: IErrorObject;
    connectorErrors: IErrorObject;
    secretsErrors: IErrorObject;
  }>({
    configErrors: {},
    connectorBaseErrors: {},
    connectorErrors: {},
    secretsErrors: {},
  });

  const [callbacks, setCallbacks] = useState<ActionConnectorFieldsCallbacks>(null);
  const actionTypeModel = actionTypeRegistry.get(actionType.id);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const res = await getConnectorErrors(connector, actionTypeModel);
      setHasErrors(
        !!Object.keys(res.connectorErrors).find(
          (errorKey) => (res.connectorErrors as IErrorObject)[errorKey].length >= 1
        )
      );
      setIsLoading(false);
      setErrors({ ...res });
    })();
  }, [connector, actionTypeModel]);

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
    <EuiModal className="actConnectorModal" data-test-subj="connectorAddModal" onClose={closeModal}>
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
        <>
          <ActionConnectorForm
            connector={connector}
            actionTypeName={actionType.name}
            dispatch={dispatch}
            serverError={serverError}
            errors={errors.connectorErrors}
            actionTypeRegistry={actionTypeRegistry}
            consumer={consumer}
            setCallbacks={setCallbacks}
            isEdit={false}
          />
          {isLoading ? (
            <>
              <EuiSpacer size="m" />
              <CenterJustifiedSpinner size="l" />{' '}
            </>
          ) : (
            <></>
          )}
        </>
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
            color="success"
            data-test-subj="saveActionButtonModal"
            type="submit"
            iconType="check"
            isLoading={isSaving}
            onClick={async () => {
              if (hasErrors) {
                setConnector(
                  getConnectorWithInvalidatedFields(
                    connector,
                    errors.configErrors,
                    errors.secretsErrors,
                    errors.connectorBaseErrors
                  )
                );
                return;
              }
              setIsSaving(true);
              // Do not allow to save the connector if there is an error
              try {
                await callbacks?.beforeActionConnectorSave?.();
              } catch (e) {
                setIsSaving(false);
                return;
              }

              const savedAction = await onActionConnectorSave();

              setIsSaving(false);
              if (savedAction) {
                await callbacks?.afterActionConnectorSave?.(savedAction);
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
  );
};

// eslint-disable-next-line import/no-default-export
export { ConnectorAddModal as default };
