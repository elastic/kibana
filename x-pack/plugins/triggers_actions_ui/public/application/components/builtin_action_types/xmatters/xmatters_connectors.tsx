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
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';

const XmattersActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<XmattersActionConnector>
> = ({ action, editActionConfig, editActionSecrets, errors, readOnly }) => {
  const { user, password, secretsUrl } = action.secrets;
  const { configUrl, usesBasic } = action.config;

  useEffect(() => {
    if (!action.id) {
      editActionConfig('usesBasic', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isUrlInvalid: boolean = usesBasic
    ? errors.configUrl !== undefined && errors.configUrl.length > 0 && configUrl !== undefined
    : errors.secretsUrl !== undefined && errors.secretsUrl.length > 0 && secretsUrl !== undefined;
  const isPasswordInvalid: boolean =
    password !== undefined && errors.password !== undefined && errors.password.length > 0;
  const isUserInvalid: boolean =
    user !== undefined && errors.user !== undefined && errors.user.length > 0;

  const authenticationButtons = [
    {
      id: XmattersAuthenticationType.Basic,
      label: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.basicAuthLabel',
        {
          defaultMessage: 'Basic Authentication',
        }
      ),
    },
    {
      id: XmattersAuthenticationType.URL,
      label: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.urlAuthLabel',
        {
          defaultMessage: 'URL Authentication',
        }
      ),
    },
  ];

  let initialState;
  if (typeof usesBasic === 'undefined') {
    initialState = XmattersAuthenticationType.Basic;
  } else {
    initialState = usesBasic ? XmattersAuthenticationType.Basic : XmattersAuthenticationType.URL;
    if (usesBasic) {
      editActionSecrets('secretsUrl', '');
    } else {
      editActionConfig('configUrl', '');
    }
  }
  const [selectedAuth, setSelectedAuth] = useState(initialState);

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
            editActionSecrets('secretsUrl', '');
          } else {
            setSelectedAuth(XmattersAuthenticationType.URL);
            editActionConfig('usesBasic', false);
            editActionConfig('configUrl', '');
            editActionSecrets('user', '');
            editActionSecrets('password', '');
          }
        }}
      />
      <EuiSpacer size="m" />
      {selectedAuth === XmattersAuthenticationType.URL ? (
        <>
          {getEncryptedFieldNotifyLabel(
            !action.id,
            1,
            action.isMissingSecrets ?? false,
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.reenterUrlAuthValuesLabel',
              {
                defaultMessage: 'URL is encrypted. Please reenter values for this field.',
              }
            )
          )}
        </>
      ) : null}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            id="url"
            fullWidth
            error={usesBasic ? errors.configUrl : errors.secretsUrl}
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
              value={usesBasic ? configUrl : secretsUrl}
              data-test-subj="xmattersUrlText"
              onChange={(e) => {
                if (selectedAuth === XmattersAuthenticationType.Basic) {
                  editActionConfig('configUrl', e.target.value);
                } else {
                  editActionSecrets('secretsUrl', e.target.value);
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
          {getEncryptedFieldNotifyLabel(
            !action.id,
            2,
            action.isMissingSecrets ?? false,
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.reenterBasicAuthValuesLabel',
              {
                defaultMessage:
                  'User and password are encrypted. Please reenter values for these fields.',
              }
            )
          )}
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
