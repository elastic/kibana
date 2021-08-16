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
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink } from '@elastic/eui';
import { ActionConnectorFieldsProps } from '../../../../types';
import { EmailActionConnector } from '../types';
import { useKibana } from '../../../../common/lib/kibana';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';

let windowObjectReference: any = null;
let previousUrl: string | null = null;

const openSignInWindow = (url: string, name: string) => {
  // window features
  const strWindowFeatures = 'toolbar=no, menubar=no, width=600, height=700, top=100, left=100';

  if (windowObjectReference === null || windowObjectReference.closed) {
    /* if the pointer to the window object in memory does not exist
     or if such pointer exists but the window was closed */
    windowObjectReference = window.open(url, name, strWindowFeatures);
  } else if (previousUrl !== url) {
    /* if the resource to load is different,
     then we load it in the already opened secondary window and then
     we bring such window back on top/in front of its parent window. */
    windowObjectReference = window.open(url, name, strWindowFeatures);
    windowObjectReference.focus();
  } else {
    /* else the window reference must exist and the window
     is not closed; therefore, we can bring it back on top of any other
     window with the focus() method. There would be no need to re-create
     the window or to reload the referenced resource. */
    windowObjectReference.focus();
  }
  // assign the previous URL
  previousUrl = url;
};

export const EmailActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<EmailActionConnector>
> = ({ action, editActionConfig, editActionSecrets, errors, readOnly }) => {
  const [authCodeUrl, setAuthCodeUrl] = useState<string | undefined>(undefined);
  const [authTokenUrl, setAuthTokenUrl] = useState<string | undefined>(undefined);
  const [redirectUrl, setRedirectTokenUrl] = useState<string | undefined>(undefined);
  const { docLinks } = useKibana().services;
  const { from, host, port, secure, hasAuth, authType } = action.config;
  const {
    user,
    password,
    accessToken,
    clientId,
    clientSecret,
    oauthScope,
    refreshToken,
  } = action.secrets;
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
  const [selectedOptions, setSelected] = useState([
    authType ? authOptions.find((opt) => opt.key === authType)! : authOptions[0],
  ]);
  const onChange = (selectedOptionsList: Array<EuiComboBoxOptionOption<unknown>>) => {
    // We should only get back either 0 or 1 options.
    setSelected(selectedOptionsList);
    editActionConfig('authType', selectedOptionsList[0].key);
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
              defaultValue={authType}
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
          {selectedOptions.length > 0 && selectedOptions[0].key === 'basic' ? (
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
          {selectedOptions.length > 0 && selectedOptions[0].key === 'oauth2' ? (
            <>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiFormRow
                    id="emailUser"
                    fullWidth
                    label={i18n.translate(
                      'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.userTextFieldLabel',
                      {
                        defaultMessage: 'Client ID',
                      }
                    )}
                  >
                    <EuiFieldText
                      fullWidth
                      readOnly={readOnly}
                      value={clientId || ''}
                      onChange={(e) => {
                        editActionSecrets('clientId', nullableString(e.target.value));
                      }}
                      onBlur={() => {
                        if (!clientId) {
                          editActionSecrets('clientId', '');
                        }
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    fullWidth
                    label={i18n.translate(
                      'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.passwordFieldLabel',
                      {
                        defaultMessage: 'Client secret',
                      }
                    )}
                  >
                    <EuiFieldText
                      fullWidth
                      readOnly={readOnly}
                      value={clientSecret || ''}
                      onChange={(e) => {
                        editActionSecrets('clientSecret', nullableString(e.target.value));
                      }}
                      onBlur={() => {
                        if (!clientSecret) {
                          editActionSecrets('clientSecret', '');
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
                    label={i18n.translate(
                      'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.userTextFieldLabel',
                      {
                        defaultMessage: 'Authorize Code URL',
                      }
                    )}
                  >
                    <EuiFieldText
                      fullWidth
                      value={authCodeUrl || ''}
                      data-test-subj="emailUserInput"
                      onChange={(e) => {
                        setAuthCodeUrl(e.target.value);
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    fullWidth
                    label={i18n.translate(
                      'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.passwordFieldLabel',
                      {
                        defaultMessage: 'Access Token URL',
                      }
                    )}
                  >
                    <EuiFieldText
                      fullWidth
                      value={authTokenUrl || ''}
                      onChange={(e) => {
                        setAuthTokenUrl(e.target.value);
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiFormRow
                    fullWidth
                    label={i18n.translate(
                      'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.userTextFieldLabel',
                      {
                        defaultMessage: 'Redirect URL',
                      }
                    )}
                  >
                    <EuiFieldText
                      fullWidth
                      value={redirectUrl || ''}
                      onChange={(e) => {
                        setRedirectTokenUrl(e.target.value);
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    fullWidth
                    label={i18n.translate(
                      'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.passwordFieldLabel',
                      {
                        defaultMessage: 'Scope',
                      }
                    )}
                  >
                    <EuiFieldText
                      fullWidth
                      value={oauthScope || ''}
                      onChange={(e) => {
                        editActionSecrets('oauthScope', nullableString(e.target.value));
                      }}
                      onBlur={() => {
                        if (!oauthScope) {
                          editActionSecrets('oauthScope', '');
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
                  <EuiButton
                    onClick={() => {
                      if (authCodeUrl && authTokenUrl) {
                        getOAuth(
                          oauthScope ?? '',
                          redirectUrl ?? '',
                          clientId ?? '',
                          clientSecret ?? '',
                          editActionSecrets,
                          editActionConfig,
                          authCodeUrl,
                          authTokenUrl
                        );
                      }
                    }}
                    data-test-subj="oauth"
                  >
                    Get OAuth
                  </EuiButton>
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

async function getOAuth(
  scope: string,
  redirectUrl: string,
  clientId: string,
  clientSecret: string,
  editActionSecrets: (property: string, value: unknown) => void,
  editActionConfig: (property: string, value: unknown) => void,
  authUrl: string,
  tokenUrl: string
) {
  const state: string = btoa(
    JSON.stringify({
      client_id: clientId,
      redirect_uri: redirectUrl,
      client_secret: clientSecret,
      tokenUrl,
    })
  );
  const r = `${authUrl}?client_id=${clientId}&response_type=code&redirect_uri=${redirectUrl}&include_granted_scopes=true&access_type=offline&response_mode=query&scope=${scope}&state=${state}&prompt=consent`;
  openSignInWindow(r, 'test');
  let loopCount = 600;
  const intervalId = window.setInterval(async () => {
    if (loopCount-- < 0) {
      window.clearInterval(intervalId);
      windowObjectReference.close();
    } else {
      let href: string | null = null; // For referencing window url
      try {
        href = windowObjectReference.location.href; // set window location to href string
      } catch (e) {
        // console.log('Error:', e); // Handle any errors here
      }
      if (href !== null) {
        /* As i was getting code and oauth-token i added for same, you can replace with your expected variables */
        if (href.match('code')) {
          const res = windowObjectReference.json;
          editActionSecrets('accessToken', `${res.token_type} ${res.access_token}`);
          editActionSecrets('refreshToken', res.refresh_token);
          editActionConfig('tokenExpirationDate', res.expires_in);
          console.log(windowObjectReference.json);
          window.clearInterval(intervalId);
          windowObjectReference.close();
        }
      }
    }
  }, 3000);
}

// eslint-disable-next-line import/no-default-export
export { EmailActionConnectorFields as default };
