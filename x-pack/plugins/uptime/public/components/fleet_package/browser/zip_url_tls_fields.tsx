/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';

import { EuiSwitch, EuiFormRow } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { TLSOptions, TLSConfig } from '../common/tls_options';
import {
  useBrowserSimpleFieldsContext,
  usePolicyConfigContext,
  defaultTLSFields,
} from '../contexts';

import { ConfigKeys } from '../types';

export const ZipUrlTLSFields = () => {
  const { defaultValues, setFields } = useBrowserSimpleFieldsContext();
  const { isZipUrlTLSEnabled, setIsZipUrlTLSEnabled } = usePolicyConfigContext();

  const handleOnChange = useCallback(
    (tlsConfig: TLSConfig) => {
      setFields((prevFields) => ({
        ...prevFields,
        [ConfigKeys.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: tlsConfig.certificateAuthorities,
        [ConfigKeys.ZIP_URL_TLS_CERTIFICATE]: tlsConfig.certificate,
        [ConfigKeys.ZIP_URL_TLS_KEY]: tlsConfig.key,
        [ConfigKeys.ZIP_URL_TLS_KEY_PASSPHRASE]: tlsConfig.keyPassphrase,
        [ConfigKeys.ZIP_URL_TLS_VERIFICATION_MODE]: tlsConfig.verificationMode,
        [ConfigKeys.ZIP_URL_TLS_VERSION]: tlsConfig.version,
      }));
    },
    [setFields]
  );

  useEffect(() => {
    if (!isZipUrlTLSEnabled) {
      setFields((prevFields) => ({
        ...prevFields,
        [ConfigKeys.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: undefined,
        [ConfigKeys.ZIP_URL_TLS_CERTIFICATE]: undefined,
        [ConfigKeys.ZIP_URL_TLS_KEY]: undefined,
        [ConfigKeys.ZIP_URL_TLS_KEY_PASSPHRASE]: undefined,
        [ConfigKeys.ZIP_URL_TLS_VERIFICATION_MODE]: undefined,
        [ConfigKeys.ZIP_URL_TLS_VERSION]: undefined,
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
                defaultValues[ConfigKeys.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES] ||
                defaultTLSFields[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES],
              certificate:
                defaultValues[ConfigKeys.ZIP_URL_TLS_CERTIFICATE] ||
                defaultTLSFields[ConfigKeys.TLS_CERTIFICATE],
              key:
                defaultValues[ConfigKeys.ZIP_URL_TLS_KEY] || defaultTLSFields[ConfigKeys.TLS_KEY],
              keyPassphrase:
                defaultValues[ConfigKeys.ZIP_URL_TLS_KEY_PASSPHRASE] ||
                defaultTLSFields[ConfigKeys.TLS_KEY_PASSPHRASE],
              verificationMode:
                defaultValues[ConfigKeys.ZIP_URL_TLS_VERIFICATION_MODE] ||
                defaultTLSFields[ConfigKeys.TLS_VERIFICATION_MODE],
              version:
                defaultValues[ConfigKeys.ZIP_URL_TLS_VERSION] ||
                defaultTLSFields[ConfigKeys.TLS_VERSION],
            }}
            onChange={handleOnChange}
            tlsRole="client"
          />
        ) : null}
      </>
    </EuiFormRow>
  );
};
