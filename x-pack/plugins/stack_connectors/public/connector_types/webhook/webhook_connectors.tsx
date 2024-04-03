/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonIcon,
  EuiTitle,
  EuiButtonEmpty,
  EuiCallOut,
  EuiTabs,
  EuiTab,
} from '@elastic/eui';
import {
  UseArray,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  Field,
  SelectField,
  TextField,
  ToggleField,
  PasswordField,
  FilePickerField,
  CardRadioGroupField,
  HiddenField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { WebhookAuthType, SSLCertType } from '../../../common/webhook/constants';
import * as i18n from './translations';

const HTTP_VERBS = ['post', 'put'];
const { emptyField, urlField } = fieldValidators;
const VERIFICATION_MODE_DEFAULT = 'full';

const WebhookActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const { setFieldValue, getFieldDefaultValue } = useFormContext();
  const [{ config, __internal__ }] = useFormData({
    watch: [
      'config.hasAuth',
      'config.authType',
      'config.certType',
      'config.verificationMode',
      '__internal__.hasHeaders',
      '__internal__.hasCA',
    ],
  });

  const hasHeadersDefaultValue = !!getFieldDefaultValue<boolean | undefined>('config.headers');
  const authTypeDefaultValue =
    getFieldDefaultValue('config.hasAuth') === false
      ? null
      : getFieldDefaultValue('config.authType') ?? WebhookAuthType.Basic;
  const certTypeDefaultValue = getFieldDefaultValue('config.certType') ?? SSLCertType.CRT;
  const hasCADefaultValue =
    !!getFieldDefaultValue<boolean | undefined>('config.ca') ||
    getFieldDefaultValue('config.verificationMode') === 'none';

  const hasHeaders = __internal__ != null ? __internal__.hasHeaders : false;
  const hasCA = __internal__ != null ? __internal__.hasCA : false;
  const authType = config == null ? WebhookAuthType.Basic : config.authType;
  const certType = config == null ? SSLCertType.CRT : config.certType;

  const hasInitialCA = !!getFieldDefaultValue<boolean | undefined>('config.ca');

  useEffect(() => setFieldValue('config.hasAuth', Boolean(authType)), [authType, setFieldValue]);

  const basicAuthFields = (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem>
        <UseField
          path="secrets.user"
          config={{
            label: i18n.USERNAME_LABEL,
            validations: [
              {
                validator: emptyField(i18n.USERNAME_REQUIRED),
              },
            ],
          }}
          component={Field}
          componentProps={{
            euiFieldProps: {
              readOnly,
              'data-test-subj': 'webhookUserInput',
              fullWidth: true,
            },
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <UseField
          path="secrets.password"
          config={{
            label: i18n.PASSWORD_LABEL,
            validations: [
              {
                validator: emptyField(i18n.PASSWORD_REQUIRED),
              },
            ],
          }}
          component={PasswordField}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'webhookPasswordInput',
              readOnly,
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const sslCertAuthFields = (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem>
        <UseField
          path="secrets.password"
          config={{
            label: i18n.PASSPHRASE_LABEL,
          }}
          component={PasswordField}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'webhookSSLPassphraseInput',
              readOnly,
            },
          }}
        />
        <EuiSpacer size="s" />
        <UseField
          path="config.certType"
          defaultValue={certTypeDefaultValue}
          component={({ field }) => (
            <EuiTabs size="s">
              <EuiTab
                onClick={() => field.setValue(SSLCertType.CRT)}
                isSelected={field.value === SSLCertType.CRT}
              >
                {i18n.CERT_TYPE_CRT_KEY}
              </EuiTab>
              <EuiTab
                onClick={() => field.setValue(SSLCertType.PFX)}
                isSelected={field.value === SSLCertType.PFX}
              >
                {i18n.CERT_TYPE_PFX}
              </EuiTab>
            </EuiTabs>
          )}
        />
        <EuiSpacer size="s" />
        {certType === SSLCertType.CRT && (
          <EuiFlexGroup>
            <EuiFlexItem>
              <UseField
                path="secrets.crt"
                config={{
                  label: 'CRT file',
                  validations: [
                    {
                      validator: emptyField(i18n.CRT_REQUIRED),
                    },
                  ],
                }}
                component={FilePickerField}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': 'webhookSSLCRTInput',
                    display: 'default',
                    accept: '.crt,.cert,.cer,.pem',
                  },
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <UseField
                path="secrets.key"
                config={{
                  label: 'KEY file',
                  validations: [
                    {
                      validator: emptyField(i18n.KEY_REQUIRED),
                    },
                  ],
                }}
                component={FilePickerField}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': 'webhookSSLKEYInput',
                    display: 'default',
                    accept: '.key,.pem',
                  },
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {certType === SSLCertType.PFX && (
          <UseField
            path="secrets.pfx"
            config={{
              label: 'PFX file',
              validations: [
                {
                  validator: emptyField(i18n.PFX_REQUIRED),
                },
              ],
            }}
            component={FilePickerField}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'webhookSSLPFXInput',
                display: 'default',
                accept: '.pfx,.p12',
              },
            }}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      <UseField path="config.hasAuth" component={HiddenField} />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <UseField
            path="config.method"
            component={SelectField}
            config={{
              label: i18n.METHOD_LABEL,
              defaultValue: 'post',
              validations: [
                {
                  validator: emptyField(i18n.METHOD_REQUIRED),
                },
              ],
            }}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'webhookMethodSelect',
                options: HTTP_VERBS.map((verb) => ({ text: verb.toUpperCase(), value: verb })),
                fullWidth: true,
                readOnly,
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path="config.url"
            config={{
              label: i18n.URL_LABEL,
              validations: [
                {
                  validator: urlField(i18n.URL_INVALID),
                },
              ],
            }}
            component={Field}
            componentProps={{
              euiFieldProps: { readOnly, 'data-test-subj': 'webhookUrlText', fullWidth: true },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.stackConnectors.components.webhook.authenticationLabel"
                defaultMessage="Authentication"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <UseField
            path="config.authType"
            defaultValue={authTypeDefaultValue}
            component={CardRadioGroupField}
            componentProps={{
              options: [
                {
                  value: null,
                  label: i18n.AUTHENTICATION_NONE,
                },
                {
                  value: WebhookAuthType.Basic,
                  label: i18n.AUTHENTICATION_BASIC,
                  children: authType === WebhookAuthType.Basic && basicAuthFields,
                },
                {
                  value: WebhookAuthType.SSL,
                  label: i18n.AUTHENTICATION_SSL,
                  children: authType === WebhookAuthType.SSL && sslCertAuthFields,
                },
              ],
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <UseField
        path="__internal__.hasHeaders"
        component={ToggleField}
        config={{ defaultValue: hasHeadersDefaultValue, label: i18n.ADD_HEADERS_LABEL }}
        componentProps={{
          euiFieldProps: {
            disabled: readOnly,
            'data-test-subj': 'webhookViewHeadersSwitch',
          },
        }}
      />
      {hasHeaders ? (
        <>
          <EuiSpacer size="m" />
          <UseArray path="config.headers" initialNumberOfItems={1}>
            {({ items, addItem, removeItem }) => {
              return (
                <>
                  {items.map((item) => (
                    <EuiFlexGroup key={item.id}>
                      <EuiFlexItem>
                        <UseField
                          path={`${item.path}.key`}
                          config={{
                            label: i18n.HEADER_KEY_LABEL,
                          }}
                          component={TextField}
                          // This is needed because when you delete
                          // a row and add a new one, the stale values will appear
                          readDefaultValueOnForm={!item.isNew}
                          componentProps={{
                            euiFieldProps: { readOnly },
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <UseField
                          path={`${item.path}.value`}
                          config={{ label: i18n.HEADER_VALUE_LABEL }}
                          component={TextField}
                          readDefaultValueOnForm={!item.isNew}
                          componentProps={{
                            euiFieldProps: { readOnly },
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          color="danger"
                          onClick={() => removeItem(item.id)}
                          iconType="minusInCircle"
                          aria-label={i18n.REMOVE_ITEM_LABEL}
                          style={{ marginTop: '28px' }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ))}
                  <EuiSpacer size="m" />
                  <EuiButtonEmpty iconType="plusInCircle" onClick={addItem}>
                    {i18n.ADD_HEADER_BTN}
                  </EuiButtonEmpty>
                  <EuiSpacer />
                </>
              );
            }}
          </UseArray>
        </>
      ) : null}
      <EuiSpacer size="m" />
      <UseField
        path="__internal__.hasCA"
        component={ToggleField}
        config={{ defaultValue: hasCADefaultValue, label: i18n.ADD_CA_LABEL }}
        componentProps={{
          euiFieldProps: {
            disabled: readOnly,
            'data-test-subj': 'webhookViewCASwitch',
          },
        }}
      />
      <EuiSpacer size="m" />
      {hasCA && (
        <>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <UseField
                path="config.ca"
                config={{
                  label: 'CA file',
                  validations: [
                    {
                      validator:
                        config?.verificationMode !== 'none'
                          ? emptyField(i18n.CA_REQUIRED)
                          : () => {},
                    },
                  ],
                }}
                component={FilePickerField}
                componentProps={{
                  euiFieldProps: {
                    display: 'default',
                    'data-test-subj': 'webhookCAInput',
                    accept: '.ca,.pem',
                  },
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <UseField
                path="config.verificationMode"
                component={SelectField}
                config={{
                  label: i18n.VERIFICATION_MODE_LABEL,
                  defaultValue: VERIFICATION_MODE_DEFAULT,
                  validations: [
                    {
                      validator: emptyField(i18n.VERIFICATION_MODE_LABEL),
                    },
                  ],
                }}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': 'webhookVerificationModeSelect',
                    options: [
                      { text: 'None', value: 'none' },
                      { text: 'Certificate', value: 'certificate' },
                      { text: 'Full', value: 'full' },
                    ],
                    fullWidth: true,
                    readOnly,
                  },
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          {hasInitialCA && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut size="s" iconType="document" title={i18n.EDIT_CA_CALLOUT} />
            </>
          )}
        </>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { WebhookActionConnectorFields as default };
