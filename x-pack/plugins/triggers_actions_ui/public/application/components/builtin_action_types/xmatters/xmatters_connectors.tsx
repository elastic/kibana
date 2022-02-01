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
  EuiButtonIcon,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiTitle,
  EuiSwitch,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionConnectorFieldsProps } from '../../../../types';
import { XmattersActionConnector } from '../types';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';

const XmattersActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<XmattersActionConnector>
> = ({ action, editActionConfig, editActionSecrets, errors, readOnly }) => {
  const { user, password } = action.secrets;
  const { url, hasAuth } = action.config;

  useEffect(() => {
    if (!action.id) {
      editActionConfig('hasAuth', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isUrlInvalid: boolean =
    errors.url !== undefined && errors.url.length > 0 && url !== undefined;
  const isPasswordInvalid: boolean =
    password !== undefined && errors.password !== undefined && errors.password.length > 0;
  const isUserInvalid: boolean =
    user !== undefined && errors.user !== undefined && errors.user.length > 0;

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            id="url"
            fullWidth
            error={errors.url}
            isInvalid={isUrlInvalid}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.urlTextFieldLabel',
              {
                defaultMessage: 'URL',
              }
            )}
          >
            <EuiFieldText
              name="url"
              isInvalid={isUrlInvalid}
              fullWidth
              readOnly={readOnly}
              value={url || ''}
              data-test-subj="xmattersUrlText"
              onChange={(e) => {
                editActionConfig('url', e.target.value);
              }}
              onBlur={() => {
                if (!url) {
                  editActionConfig('url', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.authenticationLabel"
                defaultMessage="Authentication"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiSwitch
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.hasAuthSwitchLabel',
              {
                defaultMessage: 'Require Basic Authentication for xMatters.',
              }
            )}
            disabled={readOnly}
            checked={hasAuth}
            onChange={(e) => {
              editActionConfig('hasAuth', e.target.checked);
              if (!e.target.checked) {
                editActionSecrets('user', null);
                editActionSecrets('password', null);
              }
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasAuth ? (
        <>
          {getEncryptedFieldNotifyLabel(
            !action.id,
            2,
            action.isMissingSecrets ?? false,
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.reenterValuesLabel',
              {
                defaultMessage:
                  'Username and password are encrypted. Please reenter values for these fields.',
              }
            )
          )}
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
      <EuiSpacer size="m" />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { XmattersActionConnectorFields as default };
