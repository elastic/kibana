/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import {
  UseArray,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  ToggleField,
  TextField,
  CardRadioGroupField,
  HiddenField,
  FilePickerField,
  SelectField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';

import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { AuthType, SSLCertType } from '../../../common/auth/constants';
import { SSLCertFields } from './ssl_cert_fields';
import { BasicAuthFields } from './basic_auth_fields';
import * as i18n from './translations';

interface Props {
  readOnly: boolean;
  hideSSL?: boolean;
}

const { emptyField } = fieldValidators;

const VERIFICATION_MODE_DEFAULT = 'full';

export const AuthConfig: FunctionComponent<Props> = ({ readOnly, hideSSL }) => {
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

  const authType = config == null ? AuthType.Basic : config.authType;
  const certType = config == null ? SSLCertType.CRT : config.certType;
  const hasHeaders = __internal__ != null ? __internal__.hasHeaders : false;
  const hasCA = __internal__ != null ? __internal__.hasCA : false;
  const hasInitialCA = !!getFieldDefaultValue<boolean | undefined>('config.ca');
  const hasHeadersDefaultValue = !!getFieldDefaultValue<boolean | undefined>('config.headers');
  const authTypeDefaultValue =
    getFieldDefaultValue('config.hasAuth') === false
      ? null
      : getFieldDefaultValue('config.authType') ?? AuthType.Basic;
  const certTypeDefaultValue: SSLCertType =
    getFieldDefaultValue('config.certType') ?? SSLCertType.CRT;
  const hasCADefaultValue =
    !!getFieldDefaultValue<boolean | undefined>('config.ca') ||
    getFieldDefaultValue('config.verificationMode') === 'none';

  useEffect(() => setFieldValue('config.hasAuth', Boolean(authType)), [authType, setFieldValue]);

  const hideSSLFields = hideSSL && authType !== AuthType.SSL;

  const authOptions = [
    {
      value: null,
      label: i18n.AUTHENTICATION_NONE,
      'data-test-subj': 'authNone',
    },
    {
      value: AuthType.Basic,
      label: i18n.AUTHENTICATION_BASIC,
      children: authType === AuthType.Basic && <BasicAuthFields readOnly={readOnly} />,
      'data-test-subj': 'authBasic',
    },
  ];

  if (!hideSSLFields) {
    authOptions.push({
      value: AuthType.SSL,
      label: i18n.AUTHENTICATION_SSL,
      children: authType === AuthType.SSL && (
        <SSLCertFields
          readOnly={readOnly}
          certTypeDefaultValue={certTypeDefaultValue}
          certType={certType}
        />
      ),
      'data-test-subj': 'authSSL',
    });
  }

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{i18n.AUTHENTICATION_TITLE}</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <UseField path="config.hasAuth" component={HiddenField} />
      <UseField
        path="config.authType"
        defaultValue={authTypeDefaultValue}
        component={CardRadioGroupField}
        componentProps={{
          options: authOptions,
        }}
      />
      <EuiSpacer size="m" />
      <UseField
        path="__internal__.hasHeaders"
        component={ToggleField}
        config={{
          defaultValue: hasHeadersDefaultValue,
          label: i18n.HEADERS_SWITCH,
        }}
        componentProps={{
          euiFieldProps: {
            disabled: readOnly,
            'data-test-subj': 'webhookViewHeadersSwitch',
          },
        }}
      />
      {hasHeaders && (
        <UseArray path="config.headers" initialNumberOfItems={1}>
          {({ items, addItem, removeItem }) => {
            return (
              <>
                <EuiTitle size="xxs" data-test-subj="webhookHeaderText">
                  <h5>{i18n.HEADERS_TITLE}</h5>
                </EuiTitle>
                <EuiSpacer size="s" />
                {items.map((item) => (
                  <EuiFlexGroup key={item.id}>
                    <EuiFlexItem>
                      <UseField
                        path={`${item.path}.key`}
                        config={{
                          label: i18n.KEY_LABEL,
                        }}
                        component={TextField}
                        // This is needed because when you delete
                        // a row and add a new one, the stale values will appear
                        readDefaultValueOnForm={!item.isNew}
                        componentProps={{
                          euiFieldProps: { readOnly, ['data-test-subj']: 'webhookHeadersKeyInput' },
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <UseField
                        path={`${item.path}.value`}
                        config={{ label: i18n.VALUE_LABEL }}
                        component={TextField}
                        readDefaultValueOnForm={!item.isNew}
                        componentProps={{
                          euiFieldProps: {
                            readOnly,
                            ['data-test-subj']: 'webhookHeadersValueInput',
                          },
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        color="danger"
                        onClick={() => removeItem(item.id)}
                        iconType="minusInCircle"
                        aria-label={i18n.DELETE_BUTTON}
                        style={{ marginTop: '28px' }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ))}
                <EuiSpacer size="m" />
                <EuiButtonEmpty
                  iconType="plusInCircle"
                  onClick={addItem}
                  data-test-subj="webhookAddHeaderButton"
                >
                  {i18n.ADD_BUTTON}
                </EuiButtonEmpty>
                <EuiSpacer />
              </>
            );
          }}
        </UseArray>
      )}
      <EuiSpacer size="m" />
      {!hideSSLFields && (
        <>
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
          {hasCA && (
            <>
              <EuiSpacer size="s" />
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
      )}
    </>
  );
};
