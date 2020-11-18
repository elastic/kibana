/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useEffect } from 'react';
import {
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiSwitch,
  EuiFormRow,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink } from '@elastic/eui';
import { ActionConnectorFieldsProps } from '../../../../types';
import { EmailActionConnector } from '../types';
import { useKibana } from '../../../../common/lib/kibana';

export const EmailActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  EmailActionConnector
>> = ({ action, editActionConfig, editActionSecrets, errors, readOnly }) => {
  const { docLinks } = useKibana().services;
  const { from, host, port, secure, hasAuth } = action.config;
  const { user, password } = action.secrets;
  useEffect(() => {
    if (!action.id) {
      editActionConfig('hasAuth', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="from"
            fullWidth
            error={errors.from}
            isInvalid={errors.from.length > 0 && from !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.fromTextFieldLabel',
              {
                defaultMessage: 'Sender',
              }
            )}
            helpText={
              <EuiLink
                href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/email-action-type.html#configuring-email`}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.components.builtinActionTypes.emailAction.configureAccountsHelpLabel"
                  defaultMessage="Configure email accounts"
                />
              </EuiLink>
            }
          >
            <EuiFieldText
              fullWidth
              readOnly={readOnly}
              isInvalid={errors.from.length > 0 && from !== undefined}
              name="from"
              value={from || ''}
              data-test-subj="emailFromInput"
              onChange={(e) => {
                editActionConfig('from', e.target.value);
              }}
              onBlur={() => {
                if (!from) {
                  editActionConfig('from', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            id="emailHost"
            fullWidth
            error={errors.host}
            isInvalid={errors.host.length > 0 && host !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.hostTextFieldLabel',
              {
                defaultMessage: 'Host',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              readOnly={readOnly}
              isInvalid={errors.host.length > 0 && host !== undefined}
              name="host"
              value={host || ''}
              data-test-subj="emailHostInput"
              onChange={(e) => {
                editActionConfig('host', e.target.value);
              }}
              onBlur={() => {
                if (!host) {
                  editActionConfig('host', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFormRow
                id="emailPort"
                fullWidth
                placeholder="587"
                error={errors.port}
                isInvalid={errors.port.length > 0 && port !== undefined}
                label={i18n.translate(
                  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.portTextFieldLabel',
                  {
                    defaultMessage: 'Port',
                  }
                )}
              >
                <EuiFieldNumber
                  prepend=":"
                  isInvalid={errors.port.length > 0 && port !== undefined}
                  fullWidth
                  readOnly={readOnly}
                  name="port"
                  value={port || ''}
                  data-test-subj="emailPortInput"
                  onChange={(e) => {
                    editActionConfig('port', parseInt(e.target.value, 10));
                  }}
                  onBlur={() => {
                    if (!port) {
                      editActionConfig('port', 0);
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiSwitch
                    label={i18n.translate(
                      'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.secureSwitchLabel',
                      {
                        defaultMessage: 'Secure',
                      }
                    )}
                    disabled={readOnly}
                    checked={secure || false}
                    onChange={(e) => {
                      editActionConfig('secure', e.target.checked);
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.authenticationLabel"
                defaultMessage="Authentication"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiSwitch
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.hasAuthSwitchLabel',
              {
                defaultMessage: 'Require authentication for this server',
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
          {getEncryptedFieldNotifyLabel(!action.id)}
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFormRow
                id="emailUser"
                fullWidth
                error={errors.user}
                isInvalid={errors.user.length > 0 && user !== undefined}
                label={i18n.translate(
                  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.userTextFieldLabel',
                  {
                    defaultMessage: 'Username',
                  }
                )}
              >
                <EuiFieldText
                  fullWidth
                  isInvalid={errors.user.length > 0 && user !== undefined}
                  name="user"
                  readOnly={readOnly}
                  value={user || ''}
                  data-test-subj="emailUserInput"
                  onChange={(e) => {
                    editActionSecrets('user', nullableString(e.target.value));
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
                id="emailPassword"
                fullWidth
                error={errors.password}
                isInvalid={errors.password.length > 0 && password !== undefined}
                label={i18n.translate(
                  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.passwordFieldLabel',
                  {
                    defaultMessage: 'Password',
                  }
                )}
              >
                <EuiFieldPassword
                  fullWidth
                  readOnly={readOnly}
                  isInvalid={errors.password.length > 0 && password !== undefined}
                  name="password"
                  value={password || ''}
                  data-test-subj="emailPasswordInput"
                  onChange={(e) => {
                    editActionSecrets('password', nullableString(e.target.value));
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
    </Fragment>
  );
};

// if the string == null or is empty, return null, else return string
function nullableString(str: string | null | undefined) {
  if (str == null || str.trim() === '') return null;
  return str;
}

function getEncryptedFieldNotifyLabel(isCreate: boolean) {
  if (isCreate) {
    return (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiText size="s" data-test-subj="rememberValuesMessage">
          <FormattedMessage
            id="xpack.triggersActionsUI.components.builtinActionTypes.emailAction.rememberValuesLabel"
            defaultMessage="Remember these values. You must reenter them each time you edit the connector."
          />
        </EuiText>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
  return (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiCallOut
        size="s"
        iconType="iInCircle"
        data-test-subj="reenterValuesMessage"
        title={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.emailAction.reenterValuesLabel',
          {
            defaultMessage:
              'Username and password are encrypted. Please reenter values for these fields.',
          }
        )}
      />
      <EuiSpacer size="m" />
    </Fragment>
  );
}

// eslint-disable-next-line import/no-default-export
export { EmailActionConnectorFields as default };
