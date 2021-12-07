/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import {
  EuiForm,
  EuiCallOut,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiFieldText,
  EuiFormRow,
  EuiErrorBoundary,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  IErrorObject,
  ActionTypeRegistryContract,
  UserConfiguredActionConnector,
  ActionTypeModel,
  ActionConnectorFieldsSetCallbacks,
} from '../../../types';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { useKibana } from '../../../common/lib/kibana';
import { SectionLoading } from '../../components/section_loading';
import { ConnectorReducerAction } from './connector_reducer';

export function validateBaseProperties<ConnectorConfig, ConnectorSecrets>(
  actionObject: UserConfiguredActionConnector<ConnectorConfig, ConnectorSecrets>
) {
  const validationResult = { errors: {} };
  const verrors = {
    name: new Array<string>(),
  };
  validationResult.errors = verrors;
  if (!actionObject.name) {
    verrors.name.push(
      i18n.translate(
        'xpack.triggersActionsUI.sections.actionConnectorForm.error.requiredNameText',
        {
          defaultMessage: 'Name is required.',
        }
      )
    );
  }
  return validationResult;
}

export async function getConnectorErrors<ConnectorConfig, ConnectorSecrets>(
  connector: UserConfiguredActionConnector<ConnectorConfig, ConnectorSecrets>,
  actionTypeModel: ActionTypeModel
) {
  const connectorValidationResult = await actionTypeModel?.validateConnector(connector);
  const configErrors = (
    connectorValidationResult.config ? connectorValidationResult.config.errors : {}
  ) as IErrorObject;
  const secretsErrors = (
    connectorValidationResult.secrets ? connectorValidationResult.secrets.errors : {}
  ) as IErrorObject;
  const connectorBaseErrors = validateBaseProperties(connector).errors;
  const connectorErrors = {
    ...configErrors,
    ...secretsErrors,
    ...connectorBaseErrors,
  } as IErrorObject;
  return {
    configErrors,
    secretsErrors,
    connectorBaseErrors,
    connectorErrors,
  };
}

interface ActionConnectorProps<
  ConnectorConfig = Record<string, any>,
  ConnectorSecrets = Record<string, any>
> {
  connector: UserConfiguredActionConnector<ConnectorConfig, ConnectorSecrets>;
  dispatch: React.Dispatch<ConnectorReducerAction<ConnectorConfig, ConnectorSecrets>>;
  errors: IErrorObject;
  actionTypeRegistry: ActionTypeRegistryContract;
  consumer?: string;
  actionTypeName?: string;
  serverError?: {
    body: { message: string; error: string };
  };
  setCallbacks: ActionConnectorFieldsSetCallbacks;
  isEdit: boolean;
}

export const ActionConnectorForm = ({
  connector,
  dispatch,
  actionTypeName,
  serverError,
  errors,
  actionTypeRegistry,
  consumer,
  setCallbacks,
  isEdit,
}: ActionConnectorProps) => {
  const {
    docLinks,
    application: { capabilities },
  } = useKibana().services;
  const canSave = hasSaveActionsCapability(capabilities);

  const setActionProperty = <
    Key extends keyof UserConfiguredActionConnector<
      Record<string, unknown>,
      Record<string, unknown>
    >
  >(
    key: Key,
    value:
      | UserConfiguredActionConnector<Record<string, unknown>, Record<string, unknown>>[Key]
      | null
  ) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const setActionConfigProperty = <Key extends keyof Record<string, unknown>>(
    key: Key,
    value: Record<string, unknown>[Key]
  ) => {
    dispatch({ command: { type: 'setConfigProperty' }, payload: { key, value } });
  };

  const setActionSecretsProperty = <Key extends keyof Record<string, unknown>>(
    key: Key,
    value: Record<string, unknown>[Key]
  ) => {
    dispatch({ command: { type: 'setSecretsProperty' }, payload: { key, value } });
  };

  const actionTypeRegistered = actionTypeRegistry.get(connector.actionTypeId);
  if (!actionTypeRegistered)
    return (
      <>
        <EuiCallOut
          title={i18n.translate(
            'xpack.triggersActionsUI.sections.actionConnectorForm.actions.connectorTypeConfigurationWarningTitleText',
            {
              defaultMessage: 'Connector type not registered',
            }
          )}
          color="warning"
          iconType="help"
        >
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.actionConnectorForm.actions.connectorTypeConfigurationWarningDescriptionText"
                defaultMessage="To create this connector, you must configure at least one {connectorType} account. {docLink}"
                values={{
                  connectorType: actionTypeName ?? connector.actionTypeId,
                  docLink: (
                    <EuiLink href={docLinks.links.alerting.actionTypes} target="_blank">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.actionConnectorForm.actions.actionConfigurationWarningHelpLinkText"
                        defaultMessage="Learn more."
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </EuiCallOut>
        <EuiSpacer />
      </>
    );

  const FieldsComponent = actionTypeRegistered.actionConnectorFields;
  const isNameInvalid: boolean =
    connector.name !== undefined && errors.name !== undefined && errors.name.length > 0;
  return (
    <EuiForm isInvalid={!!serverError} error={serverError?.body.message}>
      <EuiFormRow
        id="actionName"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.actionConnectorForm.actionNameLabel"
            defaultMessage="Connector name"
          />
        }
        isInvalid={isNameInvalid}
        error={errors.name}
      >
        <EuiFieldText
          fullWidth
          readOnly={!canSave}
          isInvalid={isNameInvalid}
          name="name"
          placeholder="Untitled"
          data-test-subj="nameInput"
          value={connector.name || ''}
          onChange={(e) => {
            setActionProperty('name', e.target.value);
          }}
          onBlur={() => {
            if (!connector.name) {
              setActionProperty('name', '');
            }
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      {FieldsComponent !== null ? (
        <>
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.actionConnectorForm.connectorSettingsLabel"
                defaultMessage="Connector settings"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiErrorBoundary>
            <Suspense
              fallback={
                <SectionLoading>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.actionConnectorForm.loadingConnectorSettingsDescription"
                    defaultMessage="Loading connector settings…"
                  />
                </SectionLoading>
              }
            >
              <FieldsComponent
                action={connector}
                errors={errors}
                readOnly={!canSave}
                editActionConfig={setActionConfigProperty}
                editActionSecrets={setActionSecretsProperty}
                consumer={consumer}
                setCallbacks={setCallbacks}
                isEdit={isEdit}
              />
            </Suspense>
          </EuiErrorBoundary>
        </>
      ) : null}
    </EuiForm>
  );
};
