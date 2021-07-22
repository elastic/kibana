/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { isEmpty } from 'lodash';
import { OnFormChangeFn, PackagePolicyValues } from '../typings';
import { Settings, Field, SettingsForm } from './settings_form';
import { handleFormChange } from './utils';

const basicFields: Field[] = [
  {
    key: 'tls_certificate',
    type: 'text',
    title: 'TLS certificate',
    label: 'File path to server certificate',
    required: true,
  },
  {
    key: 'tls_key',
    type: 'text',
    label: 'File path to server certificate key',
    required: true,
  },
  {
    key: 'tls_supported_protocols',
    type: 'text',
    label: 'Supported protocol versions',
    required: false,
  },
  {
    key: 'tls_cipher_suites',
    type: 'text',
    label: 'Cipher suites for TLS connections',
    helpText: 'Not configurable for TLS 1.3.',
    required: false,
  },
  {
    key: 'tls_curve_types',
    type: 'text',
    label: 'Curve types for ECDHE based cipher suites',
    required: false,
  },
];

const TLS_ENABLED_KEY = 'tls_enabled';
const tlsSettings: Settings = {
  title: 'TLS Settings',
  subtitle: 'Settings for TLS certification.',
  requiredErrorMessage: 'Required when TLS is enabled',
  fields: [
    {
      key: TLS_ENABLED_KEY,
      title: 'Enable TLS',
      type: 'bool',
      required: false,
      fields: basicFields,
    },
  ],
};

const tlsFields = basicFields;

function validateTLSForm(values: PackagePolicyValues) {
  // if TLS is disable it means that its form is valid
  if (!values[TLS_ENABLED_KEY].value) {
    return true;
  }
  return tlsFields
    .filter((field) => field.required)
    .every((field) => !isEmpty(values[field.key].value));
}

interface Props {
  values: PackagePolicyValues;
  onChange: OnFormChangeFn;
}

export function TLSSettingsForm({ values, onChange }: Props) {
  return (
    <SettingsForm
      settings={tlsSettings}
      values={values}
      onChange={(key, value) => {
        const { newValues, isValid } = handleFormChange({
          values,
          key,
          value,
          validateForm: validateTLSForm,
        });
        onChange(newValues, isValid);
      }}
    />
  );
}
