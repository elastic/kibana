/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useEffect } from 'react';
import {
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiSelect,
  EuiSwitch,
  EuiFormRow,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import { ActionConnectorFieldsProps } from '../../../../types';
import { EmailActionConnector } from '../types';
import { useKibana } from '../../../../common/lib/kibana';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';
import { getEmailServices } from './email';
import { useEmailConfig } from './use_email_config';
import { AdditionalEmailServices } from '../../../../../../actions/common';

const ExchangeFormFields = lazy(() => import('./exchange_form'));
export const EmailActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<EmailActionConnector>
> = ({ action, editActionConfig, editActionSecrets, errors, readOnly }) => {
  const { docLinks, http, isCloud } = useKibana().services;
  const { from, host, port, secure, hasAuth, service } = action.config;
  const { user, password } = action.secrets;

  const { emailServiceConfigurable, setEmailService } = useEmailConfig(
    http,
    service,
    editActionConfig
  );

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
  const isServiceInvalid: boolean =
    service !== undefined && errors.service !== undefined && errors.service.length > 0;
  const isPortInvalid: boolean =
    port !== undefined && errors.port !== undefined && errors.port.length > 0;

  const isPasswordInvalid: boolean =
    password !== undefined && errors.password !== undefined && errors.password.length > 0;
  const isUserInvalid: boolean =
    user !== undefined && errors.user !== undefined && errors.user.length > 0;

  const authForm = (
    <>
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
    </>
  );

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
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.serviceTextFieldLabel',
              {
                defaultMessage: 'Service',
              }
            )}
            error={errors.serverType}
            isInvalid={isServiceInvalid}
          >
            <EuiSelect
              name="service"
              hasNoInitialSelection={true}
              value={service}
              disabled={readOnly}
              isInvalid={isServiceInvalid}
              data-test-subj="emailServiceSelectInput"
              options={getEmailServices(isCloud)}
              onChange={(e) => {
                setEmailService(e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {service === AdditionalEmailServices.EXCHANGE ? (
        <ExchangeFormFields
          action={action}
          editActionConfig={editActionConfig}
          editActionSecrets={editActionSecrets}
          errors={errors}
          readOnly={readOnly}
        />
      ) : (
        <>
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
                  disabled={!emailServiceConfigurable}
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
                      disabled={!emailServiceConfigurable}
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
                        data-test-subj="emailSecureSwitch"
                        disabled={readOnly || !emailServiceConfigurable}
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
          {hasAuth ? authForm : null}
        </>
      )}
    </>
  );
};

// if the string == null or is empty, return null, else return string
export function nullableString(str: string | null | undefined) {
  if (str == null || str.trim() === '') return null;
  return str;
}

// eslint-disable-next-line import/no-default-export
export { EmailActionConnectorFields as default };
