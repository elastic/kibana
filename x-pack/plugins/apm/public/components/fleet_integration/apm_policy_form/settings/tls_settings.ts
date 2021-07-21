/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Settings } from '../settings_form';

export const tlsSettings: Settings = {
  title: 'TLS Settings',
  subtitle: 'Settings for TLS certification.',
  fields: [
    {
      key: 'tls_enabled',
      title: 'Enable TLS',
      type: 'bool',
      required: true,
      defaultValue: false,
      fields: [
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
      ],
    },
  ],
};
