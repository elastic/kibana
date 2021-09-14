/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { PackagePolicyVars, SettingsRow } from '../typings';
import {
  isSettingsFormValid,
  OPTIONAL_LABEL,
  REQUIRED_LABEL,
} from '../settings_form/utils';

const TLS_ENABLED_KEY = 'tls_enabled';

export function getTLSSettings(): SettingsRow[] {
  return [
    {
      key: TLS_ENABLED_KEY,
      rowTitle: i18n.translate(
        'xpack.apm.fleet_integration.settings.tls.tlsEnabledTitle',
        { defaultMessage: 'Enable TLS' }
      ),
      type: 'boolean',
      settings: [
        {
          key: 'tls_certificate',
          type: 'text',
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.tls.tlsCertificateLabel',
            { defaultMessage: 'File path to server certificate' }
          ),
          rowTitle: i18n.translate(
            'xpack.apm.fleet_integration.settings.tls.tlsCertificateTitle',
            { defaultMessage: 'TLS certificate' }
          ),
          labelAppend: REQUIRED_LABEL,
          required: true,
        },
        {
          key: 'tls_key',
          type: 'text',
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.tls.tlsKeyLabel',
            { defaultMessage: 'File path to server certificate key' }
          ),
          labelAppend: REQUIRED_LABEL,
          required: true,
        },
        {
          key: 'tls_supported_protocols',
          type: 'combo',
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.tls.tlsSupportedProtocolsLabel',
            { defaultMessage: 'Supported protocol versions' }
          ),
          labelAppend: OPTIONAL_LABEL,
        },
        {
          key: 'tls_cipher_suites',
          type: 'combo',
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.tls.tlsCipherSuitesLabel',
            { defaultMessage: 'Cipher suites for TLS connections' }
          ),
          helpText: i18n.translate(
            'xpack.apm.fleet_integration.settings.tls.tlsCipherSuitesHelpText',
            { defaultMessage: 'Not configurable for TLS 1.3.' }
          ),
          labelAppend: OPTIONAL_LABEL,
        },
        {
          key: 'tls_curve_types',
          type: 'combo',
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.tls.tlsCurveTypesLabel',
            { defaultMessage: 'Curve types for ECDHE based cipher suites' }
          ),
          labelAppend: OPTIONAL_LABEL,
        },
      ],
    },
  ];
}

export function isTLSFormValid(
  newVars: PackagePolicyVars,
  tlsSettings: SettingsRow[]
) {
  // only validates TLS when its flag is enabled
  return (
    !newVars[TLS_ENABLED_KEY].value || isSettingsFormValid(tlsSettings, newVars)
  );
}
