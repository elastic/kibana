/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiCallOut, EuiFieldText, EuiFormRow, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionConnectorFieldsProps } from '../../../../types';
import { SwimlaneActionConnector } from '.././types';

const SwimlaneActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  SwimlaneActionConnector
>> = ({ errors, action, editActionConfig, editActionSecrets, docLinks, readOnly }) => {
  const { apiUrl } = action.config;
  const { appId } = action.config;
  const { username } = action.config;
  const { apiToken } = action.config;
  return (
    <Fragment>
      <EuiFormRow
        id="apiUrl"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.apiUrlTextFieldLabel',
          {
            defaultMessage: 'API URL',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="apiUrl"
          value={apiUrl || ''}
          readOnly={readOnly}
          data-test-subj="swimlaneApiUrlInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editActionConfig('apiUrl', e.target.value);
          }}
          onBlur={() => {
            if (!apiUrl) {
              editActionConfig('apiUrl');
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="appId"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.appIdTextFieldLabel',
          {
            defaultMessage: 'Application Id',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="appId"
          value={appId}
          readOnly={readOnly}
          data-test-subj="swimlaneAppIdInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editActionConfig('appId', e.target.value);
          }}
          onBlur={() => {
            if (!apiUrl) {
              editActionConfig('appId');
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="username"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.usernameTextFieldLabel',
          {
            defaultMessage: 'API Username',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="username"
          value={username}
          readOnly={readOnly}
          data-test-subj="swimlaneUsernameInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editActionConfig('username', e.target.value);
          }}
          onBlur={() => {
            if (!apiUrl) {
              editActionConfig('username');
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="apiToken"
        fullWidth
        helpText={
          <EuiLink
            href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/swimlane-action-type.html`}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.apiTokenNameHelpLabel"
              defaultMessage="Provide a Swimlane API Token"
            />
          </EuiLink>
        }
        error={errors.routingKey}
        isInvalid={errors.routingKey.length > 0 && routingKey !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.apiTokenTextFieldLabel',
          {
            defaultMessage: 'API Token',
          }
        )}
      >
        <Fragment>
          {getEncryptedFieldNotifyLabel(!action.id)}
          <EuiFieldText
            fullWidth
            isInvalid={errors.apiToken.length > 0 && apiToken !== undefined}
            name="apiToken"
            readOnly={readOnly}
            value={apiToken}
            data-test-subj="swimlaneApiTokenInput"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              editActionSecrets('apiToken', e.target.value);
            }}
            onBlur={() => {
              if (!apiToken) {
                editActionSecrets('apiToken', '');
              }
            }}
          />
        </Fragment>
      </EuiFormRow>
    </Fragment>
  );
};

function getEncryptedFieldNotifyLabel(isCreate: boolean) {
  return (
    <Fragment>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        iconType="iInCircle"
        data-test-subj="reenterValuesMessage"
        title={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.reenterValueLabel',
          { defaultMessage: 'This key is encrypted. Please reenter a value for this field.' }
        )}
      />
      <EuiSpacer size="m" />
    </Fragment>
  );
}

// eslint-disable-next-line import/no-default-export
export { SwimlaneActionConnectorFields as default };
