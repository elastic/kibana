/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiSwitch,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionConnectorFieldsProps } from '../../../../types';
import { EmailActionConnector } from '../types';

export const EmailActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  EmailActionConnector
>> = ({ action, editActionConfig, editActionSecrets, errors }) => {
  const { from, host, port, secure } = action.config;
  const { user, password } = action.secrets;

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
          >
            <EuiFieldText
              fullWidth
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
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            id="emailUser"
            fullWidth
            error={errors.user}
            isInvalid={errors.user.length > 0}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.userTextFieldLabel',
              {
                defaultMessage: 'Username',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              isInvalid={errors.user.length > 0}
              name="user"
              value={user || ''}
              data-test-subj="emailUserInput"
              onChange={(e) => {
                editActionSecrets('user', nullableString(e.target.value));
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="emailPassword"
            fullWidth
            error={errors.password}
            isInvalid={errors.password.length > 0}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.passwordFieldLabel',
              {
                defaultMessage: 'Password',
              }
            )}
          >
            <EuiFieldPassword
              fullWidth
              isInvalid={errors.password.length > 0}
              name="password"
              value={password || ''}
              data-test-subj="emailPasswordInput"
              onChange={(e) => {
                editActionSecrets('password', nullableString(e.target.value));
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};

// if the string == null or is empty, return null, else return string
function nullableString(str: string | null | undefined) {
  if (str == null || str.trim() === '') return null;
  return str;
}

// eslint-disable-next-line import/no-default-export
export { EmailActionConnectorFields as default };
