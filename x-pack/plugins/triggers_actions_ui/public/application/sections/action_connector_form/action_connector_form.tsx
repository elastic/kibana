/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, Suspense } from 'react';
import {
  EuiForm,
  EuiCallOut,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiFieldText,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { HttpSetup, DocLinksStart } from 'kibana/public';
import { ReducerAction } from './connector_reducer';
import { ActionConnector, IErrorObject, ActionTypeModel } from '../../../types';
import { TypeRegistry } from '../../type_registry';

export function validateBaseProperties(actionObject: ActionConnector) {
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

interface ActionConnectorProps {
  connector: ActionConnector;
  dispatch: React.Dispatch<ReducerAction>;
  actionTypeName: string;
  serverError?: {
    body: { message: string; error: string };
  };
  errors: IErrorObject;
  http: HttpSetup;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  docLinks: DocLinksStart;
  consumer?: string;
}

export const ActionConnectorForm = ({
  connector,
  dispatch,
  actionTypeName,
  serverError,
  errors,
  http,
  actionTypeRegistry,
  docLinks,
  consumer,
}: ActionConnectorProps) => {
  const setActionProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const setActionConfigProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setConfigProperty' }, payload: { key, value } });
  };

  const setActionSecretsProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setSecretsProperty' }, payload: { key, value } });
  };

  const actionTypeRegistered = actionTypeRegistry.get(connector.actionTypeId);
  if (!actionTypeRegistered)
    return (
      <Fragment>
        <EuiCallOut
          title={i18n.translate(
            'xpack.triggersActionsUI.sections.actionConnectorForm.actions.actionTypeConfigurationWarningTitleText',
            {
              defaultMessage: 'Action type not registered',
            }
          )}
          color="warning"
          iconType="help"
        >
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.actionConnectorForm.actions.actionConfigurationWarningDescriptionText"
                defaultMessage="To create this connector, you must configure at least one {actionType} account. {docLink}"
                values={{
                  actionType: actionTypeName,
                  docLink: (
                    <EuiLink
                      href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/action-types.html`}
                      target="_blank"
                    >
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
      </Fragment>
    );

  const FieldsComponent = actionTypeRegistered.actionConnectorFields;

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
        isInvalid={errors.name.length > 0 && connector.name !== undefined}
        error={errors.name}
      >
        <EuiFieldText
          fullWidth
          autoFocus={true}
          isInvalid={errors.name.length > 0 && connector.name !== undefined}
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
        <Suspense
          fallback={
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <FieldsComponent
            action={connector}
            errors={errors}
            editActionConfig={setActionConfigProperty}
            editActionSecrets={setActionSecretsProperty}
            http={http}
            docLinks={docLinks}
            consumer={consumer}
          />
        </Suspense>
      ) : null}
    </EuiForm>
  );
};
