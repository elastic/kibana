/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';

import { EuiSwitch, EuiFormRow } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { TLSOptions, TLSConfig } from '../common/tls_options';
import {
  useBrowserSimpleFieldsContext,
  usePolicyConfigContext,
  defaultTLSFields,
} from '../contexts';

import { ConfigKey } from '../types';

export const ZipUrlTLSFields = () => {
  const { defaultValues, setFields } = useBrowserSimpleFieldsContext();
  const { isZipUrlTLSEnabled, setIsZipUrlTLSEnabled } = usePolicyConfigContext();

  const handleOnChange = useCallback(
    (tlsConfig: TLSConfig) => {
      setFields((prevFields) => ({
        ...prevFields,
        [ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: tlsConfig.certificateAuthorities,
        [ConfigKey.ZIP_URL_TLS_CERTIFICATE]: tlsConfig.certificate,
        [ConfigKey.ZIP_URL_TLS_KEY]: tlsConfig.key,
        [ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE]: tlsConfig.keyPassphrase,
        [ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]: tlsConfig.verificationMode,
        [ConfigKey.ZIP_URL_TLS_VERSION]: tlsConfig.version,
      }));
    },
    [setFields]
  );

  useEffect(() => {
    if (!isZipUrlTLSEnabled) {
      setFields((prevFields) => ({
        ...prevFields,
        [ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: undefined,
        [ConfigKey.ZIP_URL_TLS_CERTIFICATE]: undefined,
        [ConfigKey.ZIP_URL_TLS_KEY]: undefined,
        [ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE]: undefined,
        [ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]: undefined,
        [ConfigKey.ZIP_URL_TLS_VERSION]: undefined,
      }));
    }
  }, [setFields, isZipUrlTLSEnabled]);

  return (
    <EuiFormRow>
      <>
        <EuiSwitch
          id={'syntheticsBrowserIsZipUrlTLSEnabled'}
          data-test-subj="syntheticsBrowserIsZipUrlTLSEnabled"
          checked={!!isZipUrlTLSEnabled}
          label={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.certificateSettings.enableZipUrlSSLSettings.label"
              defaultMessage="Enable TLS configuration for Zip URL"
            />
          }
          onChange={(event) => setIsZipUrlTLSEnabled(event.target.checked)}
        />
        {isZipUrlTLSEnabled ? (
          <TLSOptions
            defaultValues={{
              certificateAuthorities:
                defaultValues[ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES] ||
                defaultTLSFields[ConfigKey.TLS_CERTIFICATE_AUTHORITIES],
              certificate:
                defaultValues[ConfigKey.ZIP_URL_TLS_CERTIFICATE] ||
                defaultTLSFields[ConfigKey.TLS_CERTIFICATE],
              key: defaultValues[ConfigKey.ZIP_URL_TLS_KEY] || defaultTLSFields[ConfigKey.TLS_KEY],
              keyPassphrase:
                defaultValues[ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE] ||
                defaultTLSFields[ConfigKey.TLS_KEY_PASSPHRASE],
              verificationMode:
                defaultValues[ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE] ||
                defaultTLSFields[ConfigKey.TLS_VERIFICATION_MODE],
              version:
                defaultValues[ConfigKey.ZIP_URL_TLS_VERSION] ||
                defaultTLSFields[ConfigKey.TLS_VERSION],
            }}
            onChange={handleOnChange}
            tlsRole="client"
          />
        ) : null}
      </>
    </EuiFormRow>
  );
};
