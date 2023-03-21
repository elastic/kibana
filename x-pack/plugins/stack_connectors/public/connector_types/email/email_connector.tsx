/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useEffect, useMemo } from 'react';
import { isEmpty } from 'lodash';
import { EuiFlexItem, EuiFlexGroup, EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import { InvalidEmailReason } from '@kbn/actions-plugin/common';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import {
  UseField,
  useFormContext,
  useFormData,
  FieldConfig,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  NumericField,
  SelectField,
  TextField,
  ToggleField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  PasswordField,
  useConnectorContext,
  useKibana,
} from '@kbn/triggers-actions-ui-plugin/public';
import { AdditionalEmailServices } from '../../../common';
import { getEmailServices } from './email';
import { useEmailConfig } from './use_email_config';
import * as i18n from './translations';

const { emptyField } = fieldValidators;

const ExchangeFormFields = lazy(() => import('./exchange_form'));

const shouldDisableEmailConfiguration = (service: string | null | undefined) =>
  isEmpty(service) ||
  (service !== AdditionalEmailServices.EXCHANGE && service !== AdditionalEmailServices.OTHER);

const getEmailConfig = (
  href: string,
  validateFunc: ActionsPublicPluginSetup['validateEmailAddresses']
): FieldConfig<string> => ({
  label: i18n.FROM_LABEL,
  helpText: (
    <EuiLink href={href} target="_blank">
      <FormattedMessage
        id="xpack.stackConnectors.components.email.configureAccountsHelpLabel"
        defaultMessage="Configure email accounts"
      />
    </EuiLink>
  ),
  validations: [
    { validator: emptyField(i18n.SENDER_REQUIRED) },
    {
      validator: ({ value }) => {
        const validatedEmail = validateFunc([value])[0];
        if (!validatedEmail.valid) {
          const message =
            validatedEmail.reason === InvalidEmailReason.notAllowed
              ? i18n.getNotAllowedEmailAddress(value)
              : i18n.getInvalidEmailAddress(value);

          return {
            message,
          };
        }
      },
    },
  ],
});

const portConfig: FieldConfig<string> = {
  label: i18n.PORT_LABEL,
  validations: [
    {
      validator: emptyField(i18n.PORT_REQUIRED),
    },
    {
      validator: ({ value }) => {
        const port = Number.parseFloat(value);

        if (!Number.isInteger(port)) {
          return { message: i18n.PORT_INVALID };
        }
      },
    },
  ],
};

export const EmailActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const {
    docLinks,
    http,
    isCloud,
    notifications: { toasts },
  } = useKibana().services;
  const {
    services: { validateEmailAddresses },
  } = useConnectorContext();

  const form = useFormContext();
  const { updateFieldValues } = form;
  const [{ config }] = useFormData({
    watch: ['config.service', 'config.hasAuth'],
  });

  const emailFieldConfig = useMemo(
    () => getEmailConfig(docLinks.links.alerting.emailActionConfig, validateEmailAddresses),
    [docLinks.links.alerting.emailActionConfig, validateEmailAddresses]
  );

  const { service = null, hasAuth = false } = config ?? {};
  const disableServiceConfig = shouldDisableEmailConfiguration(service);
  const { isLoading, getEmailServiceConfig } = useEmailConfig({ http, toasts });

  useEffect(() => {
    async function fetchConfig() {
      if (
        service === null ||
        service === AdditionalEmailServices.OTHER ||
        service === AdditionalEmailServices.EXCHANGE
      ) {
        return;
      }

      const emailConfig = await getEmailServiceConfig(service);
      updateFieldValues({
        config: {
          host: emailConfig?.host,
          port: emailConfig?.port,
          secure: emailConfig?.secure,
        },
      });
    }

    fetchConfig();
  }, [updateFieldValues, getEmailServiceConfig, service]);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField
            path="config.from"
            component={TextField}
            config={emailFieldConfig}
            componentProps={{
              euiFieldProps: { 'data-test-subj': 'emailFromInput', readOnly },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <UseField
            path="config.service"
            component={SelectField}
            config={{
              label: i18n.SERVICE_LABEL,
              validations: [
                {
                  validator: emptyField(i18n.SERVICE_REQUIRED),
                },
              ],
            }}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'emailServiceSelectInput',
                options: getEmailServices(isCloud),
                fullWidth: true,
                hasNoInitialSelection: true,
                disabled: readOnly || isLoading,
                isLoading,
                readOnly,
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {service === AdditionalEmailServices.EXCHANGE ? (
        <ExchangeFormFields readOnly={readOnly} />
      ) : (
        <>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <UseField
                path="config.host"
                component={TextField}
                config={{
                  label: i18n.HOST_LABEL,
                  validations: [
                    {
                      validator: emptyField(i18n.HOST_REQUIRED),
                    },
                  ],
                }}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': 'emailHostInput',
                    readOnly,
                    isLoading,
                    disabled: disableServiceConfig,
                  },
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <UseField
                    path="config.port"
                    component={NumericField}
                    config={portConfig}
                    componentProps={{
                      euiFieldProps: {
                        'data-test-subj': 'emailPortInput',
                        readOnly,
                        isLoading,
                        disabled: disableServiceConfig,
                      },
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <UseField
                    path="config.secure"
                    component={ToggleField}
                    config={{ defaultValue: false }}
                    componentProps={{
                      hasEmptyLabelSpace: true,
                      euiFieldProps: {
                        label: i18n.SECURE_LABEL,
                        disabled: readOnly || disableServiceConfig,
                        'data-test-subj': 'emailSecureSwitch',
                        readOnly,
                      },
                    }}
                  />
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
                    id="xpack.stackConnectors.components.email.authenticationLabel"
                    defaultMessage="Authentication"
                  />
                </h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              <UseField
                path="config.hasAuth"
                component={ToggleField}
                config={{ defaultValue: true }}
                componentProps={{
                  euiFieldProps: {
                    label: i18n.HAS_AUTH_LABEL,
                    disabled: readOnly,
                    readOnly,
                  },
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          {hasAuth ? (
            <>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <UseField
                    path="secrets.user"
                    component={TextField}
                    config={{
                      label: i18n.USERNAME_LABEL,
                      validations: [
                        {
                          validator: emptyField(i18n.USERNAME_REQUIRED),
                        },
                      ],
                    }}
                    componentProps={{
                      euiFieldProps: { 'data-test-subj': 'emailUserInput', readOnly },
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <PasswordField
                    path="secrets.password"
                    label={i18n.PASSWORD_LABEL}
                    readOnly={readOnly}
                    data-test-subj="emailPasswordInput"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          ) : null}
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
