/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiSwitch,
  EuiFormRow,
  EuiTitle,
  EuiSpacer,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiButton,
} from '@elastic/eui';
import { HttpSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink } from '@elastic/eui';
import { ActionConnectorFieldsProps } from '../../../../types';
import { EmailActionConnector } from '../types';
import { useKibana } from '../../../../common/lib/kibana';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';

export const EmailActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<EmailActionConnector>
> = ({ action, editActionConfig, editActionSecrets, errors, readOnly }) => {
  const { docLinks, http } = useKibana().services;
  const { from, host, port, secure, hasAuth } = action.config;
  const { user, password } = action.secrets;
  useEffect(() => {
    if (!action.id) {
      editActionConfig('hasAuth', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFromInvalid: boolean =
    from !== undefined && errors.from !== undefined && errors.from.length > 0;
  const isHostInvalid: boolean =
    host !== undefined && errors.host !== undefined && errors.host.length > 0;
  const isPortInvalid: boolean =
    port !== undefined && errors.port !== undefined && errors.port.length > 0;

  const isPasswordInvalid: boolean =
    password !== undefined && errors.password !== undefined && errors.password.length > 0;
  const isUserInvalid: boolean =
    user !== undefined && errors.user !== undefined && errors.user.length > 0;

  const authOptions = [
    {
      label: 'Basic Auth',
      'data-test-subj': 'titanOption',
      key: 'basic',
    },
    {
      label: 'OAuth 2.0',
      key: 'oauth2',
    },
  ] as Array<EuiComboBoxOptionOption<unknown>>;
  const [selectedOptions, setSelected] = useState([authOptions[0]]);
  const onChange = (selectedOptionsList: Array<EuiComboBoxOptionOption<unknown>>) => {
    // We should only get back either 0 or 1 options.
    setSelected(selectedOptionsList);
  };
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="from"
            fullWidth
            error={errors.from}
            isInvalid={isFromInvalid}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.fromTextFieldLabel',
              {
                defaultMessage: 'Sender',
              }
            )}
            helpText={
              <EuiLink href={docLinks.links.alerting.emailActionConfig} target="_blank">
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
              isInvalid={isFromInvalid}
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
            isInvalid={isHostInvalid}
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
              isInvalid={isHostInvalid}
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
                isInvalid={isPortInvalid}
                label={i18n.translate(
                  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.portTextFieldLabel',
                  {
                    defaultMessage: 'Port',
                  }
                )}
              >
                <EuiFieldNumber
                  prepend=":"
                  isInvalid={isPortInvalid}
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
            checked={hasAuth || false}
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
          <EuiSpacer size="s" />
          <EuiFormRow
            id="emailUser"
            fullWidth
            error={errors.user}
            isInvalid={isUserInvalid}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.userTextFieldLabel',
              {
                defaultMessage: 'Authorization type',
              }
            )}
          >
            <EuiComboBox
              placeholder="Select one or more options"
              options={authOptions}
              singleSelection={{ asPlainText: true }}
              selectedOptions={selectedOptions}
              onChange={onChange}
            />
          </EuiFormRow>
          {getEncryptedFieldNotifyLabel(
            !action.id,
            2,
            action.isMissingSecrets ?? false,
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.emailAction.reenterValuesLabel',
              {
                defaultMessage:
                  'Username and password are encrypted. Please reenter values for these fields.',
              }
            )
          )}
          {selectedOptions[0].key === 'basic' ? (
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiFormRow
                  id="emailUser"
                  fullWidth
                  error={errors.user}
                  isInvalid={isUserInvalid}
                  label={i18n.translate(
                    'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.userTextFieldLabel',
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
                  isInvalid={isPasswordInvalid}
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
                    isInvalid={isPasswordInvalid}
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
          ) : null}
          {selectedOptions[0].key === 'oauth2' ? (
            <>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiFormRow
                    id="emailUser"
                    fullWidth
                    error={errors.user}
                    isInvalid={isUserInvalid}
                    label={i18n.translate(
                      'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.userTextFieldLabel',
                      {
                        defaultMessage: 'Client ID',
                      }
                    )}
                  >
                    <EuiFieldText
                      fullWidth
                      isInvalid={isUserInvalid}
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
                    isInvalid={isPasswordInvalid}
                    label={i18n.translate(
                      'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.passwordFieldLabel',
                      {
                        defaultMessage: 'Client secret',
                      }
                    )}
                  >
                    <EuiFieldPassword
                      fullWidth
                      readOnly={readOnly}
                      isInvalid={isPasswordInvalid}
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
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiFormRow
                    id="emailUser"
                    fullWidth
                    error={errors.user}
                    isInvalid={isUserInvalid}
                    label={i18n.translate(
                      'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.userTextFieldLabel',
                      {
                        defaultMessage: 'Grant Type',
                      }
                    )}
                  >
                    <EuiComboBox
                      placeholder="Select one or more options"
                      options={[
                        {
                          label: 'Authorization Code',
                        },
                      ]}
                      singleSelection={{ asPlainText: true }}
                      selectedOptions={[
                        {
                          label: 'Authorization Code',
                        },
                      ]}
                      onChange={() => {}}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiLink
                    onClick={() => getOAuth(http)}
                    data-test-subj="oauth"
                    iconType="arrowRight"
                    iconSide="right"
                  >
                    Get OAuth
                  </EuiLink>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
};

// if the string == null or is empty, return null, else return string
function nullableString(str: string | null | undefined) {
  if (str == null || str.trim() === '') return null;
  return str;
}

async function getOAuth(http: HttpSetup) {
  
  const newWindow = window.open(
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=e9585117-2313-4f62-9a6d-d1aad4260d4f&response_type=code&redirect_uri=https://localhost:5601&response_mode=query&scope=openid%20offline_access%20https%3A%2F%2Foutlook.office.com%2FSMTP.Send&state=12345`,
    'name',
    'height=600,width=450'
  );
  newWindow?.focus();
  console.log(res);
  // https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=e9585117-2313-4f62-9a6d-d1aad4260d4f&response_type=code&redirect_uri=https://localhost:5601&response_mode=query&scope=openid%20offline_access%20https%3A%2F%2Foutlook.office.com%2FSMTP.Send&state=12345
}

// eslint-disable-next-line import/no-default-export
export { EmailActionConnectorFields as default };
