/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiButtonGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionConnectorFieldsProps } from '../../../../types';
import { XmattersActionConnector, XmattersAuthenticationType } from '../types';

const XmattersActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<XmattersActionConnector>
> = ({ action, editActionConfig, editActionSecrets, errors, readOnly }) => {
  const { user, password, urlSecrets } = action.secrets;
  const { urlConfig, usesBasic } = action.config;

  useEffect(() => {
    if (!action.id) {
      editActionConfig('usesBasic', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isUrlInvalid: boolean =
    errors.urlSecrets !== undefined &&
    errors.urlSecrets.length > 0 &&
    urlSecrets !== undefined &&
    errors.urlConfig !== undefined &&
    errors.urlConfig.length > 0 &&
    urlConfig !== undefined;
  const isPasswordInvalid: boolean =
    password !== undefined && errors.password !== undefined && errors.password.length > 0;
  const isUserInvalid: boolean =
    user !== undefined && errors.user !== undefined && errors.user.length > 0;

  const authenticationButtons = [
    { id: XmattersAuthenticationType.Basic, label: 'Basic Authentication' },
    { id: XmattersAuthenticationType.URL, label: 'URL Authentication' },
  ];

  const [selectedAuth, setSelectedAuth] = useState(XmattersAuthenticationType.Basic);

  return (
    <>
      <EuiTitle size="xxs">
        <h4>
          <FormattedMessage
            id="xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.authenticationLabel"
            defaultMessage="Authentication"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiFormRow fullWidth>
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.connectorSettingsLabel"
            defaultMessage="Select the authentication method used when setting up the xMatters trigger."
          />
        </p>
      </EuiFormRow>
      <EuiSpacer size="l" />
      <EuiButtonGroup
        isFullWidth
        buttonSize="m"
        legend="Basic Authentication"
        options={authenticationButtons}
        color="primary"
        idSelected={selectedAuth}
        onChange={(id: string) => {
          if (id === XmattersAuthenticationType.Basic) {
            setSelectedAuth(XmattersAuthenticationType.Basic);
            editActionConfig('usesBasic', true);
            editActionSecrets('urlSecrets', '');
          } else {
            setSelectedAuth(XmattersAuthenticationType.URL);
            editActionConfig('usesBasic', false);
            editActionConfig('urlConfig', '');
            editActionSecrets('user', '');
            editActionSecrets('password', '');
          }
        }}
      />
      <EuiSpacer size="m" />
      {selectedAuth === XmattersAuthenticationType.URL ? (
        <>
          <EuiFormRow fullWidth>
            <p>
              <FormattedMessage
                data-test-subj="urlReenterDescription"
                id="xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.urlReenterDescription"
                defaultMessage="You must reenter this value each time you edit the connector."
              />
            </p>
          </EuiFormRow>
          <EuiSpacer size="m" />
        </>
      ) : null}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            id="url"
            fullWidth
            error={usesBasic ? errors.urlConfig : errors.urlSecrets}
            isInvalid={isUrlInvalid}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.connectorSettingsFieldLabel',
              {
                defaultMessage: 'Initiation URL',
              }
            )}
            helpText={
              <FormattedMessage
                id="xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.initiationUrlHelpText"
                defaultMessage="Include the full xMatters url."
              />
            }
          >
            <EuiFieldText
              name="url"
              isInvalid={isUrlInvalid}
              fullWidth
              readOnly={readOnly}
              value={usesBasic ? urlConfig : urlSecrets}
              data-test-subj="xmattersUrlText"
              onChange={(e) => {
                if (selectedAuth === XmattersAuthenticationType.Basic) {
                  editActionConfig('urlConfig', e.target.value);
                } else {
                  editActionSecrets('urlSecrets', e.target.value);
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {selectedAuth === XmattersAuthenticationType.Basic ? (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                data-test-subj="userCredsLabel"
                id="xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.userCredsLabel"
                defaultMessage="User credentials"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiFormRow fullWidth>
            <p>
              <FormattedMessage
                id="xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.userCredsDescription"
                defaultMessage="You will need to reenter these credentials each time you edit the connector."
              />
            </p>
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFormRow
                id="xmattersUser"
                fullWidth
                error={errors.user}
                isInvalid={isUserInvalid}
                label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.userTextFieldLabel',
                  {
                    defaultMessage: 'Username',
                  }
                )}
              >
                <EuiFieldText
                  fullWidth
                  isInvalid={isUserInvalid}
                  name="user"
                  readOnly={readOnly}
                  value={user || ''}
                  data-test-subj="xmattersUserInput"
                  onChange={(e) => {
                    editActionSecrets('user', e.target.value);
                  }}
                  onBlur={() => {
                    if (!user) {
                      editActionSecrets('user', '');
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                id="xmattersPassword"
                fullWidth
                error={errors.password}
                isInvalid={isPasswordInvalid}
                label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.passwordTextFieldLabel',
                  {
                    defaultMessage: 'Password',
                  }
                )}
              >
                <EuiFieldPassword
                  fullWidth
                  name="password"
                  readOnly={readOnly}
                  isInvalid={isPasswordInvalid}
                  value={password || ''}
                  data-test-subj="xmattersPasswordInput"
                  onChange={(e) => {
                    editActionSecrets('password', e.target.value);
                  }}
                  onBlur={() => {
                    if (!password) {
                      editActionSecrets('password', '');
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { XmattersActionConnectorFields as default };
