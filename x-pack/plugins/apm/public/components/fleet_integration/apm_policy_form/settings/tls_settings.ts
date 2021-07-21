/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash';
import { PackagePolicyValues } from '..';
import { Settings, Field } from './settings_form';

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
export const tlsSettings: Settings = {
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

export function validateTLSForm(values: PackagePolicyValues) {
  // if TLS is disable it means that its form is valid
  if (!values[TLS_ENABLED_KEY].value) {
    return true;
  }
  return tlsFields
    .filter((field) => field.required)
    .every((field) => !isEmpty(values[field.key].value));
}
