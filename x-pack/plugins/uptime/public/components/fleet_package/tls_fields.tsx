/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';

import { TLSOptions, TLSConfig } from './common/tls_options';
import { useTLSFieldsContext, usePolicyConfigContext } from './contexts';

import { ConfigKey } from './types';

export const TLSFields = () => {
  const { defaultValues, setFields } = useTLSFieldsContext();
  const { isTLSEnabled } = usePolicyConfigContext();

  const handleOnChange = useCallback(
    (tlsConfig: TLSConfig) => {
      setFields({
        [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: tlsConfig.certificateAuthorities,
        [ConfigKey.TLS_CERTIFICATE]: tlsConfig.certificate,
        [ConfigKey.TLS_KEY]: tlsConfig.key,
        [ConfigKey.TLS_KEY_PASSPHRASE]: tlsConfig.keyPassphrase,
        [ConfigKey.TLS_VERIFICATION_MODE]: tlsConfig.verificationMode,
        [ConfigKey.TLS_VERSION]: tlsConfig.version,
      });
    },
    [setFields]
  );

  useEffect(() => {
    if (!isTLSEnabled) {
      setFields({
        [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: undefined,
        [ConfigKey.TLS_CERTIFICATE]: undefined,
        [ConfigKey.TLS_KEY]: undefined,
        [ConfigKey.TLS_KEY_PASSPHRASE]: undefined,
        [ConfigKey.TLS_VERIFICATION_MODE]: undefined,
        [ConfigKey.TLS_VERSION]: undefined,
      });
    }
  }, [setFields, isTLSEnabled]);

  return isTLSEnabled ? (
    <TLSOptions
      defaultValues={{
        certificateAuthorities: defaultValues[ConfigKey.TLS_CERTIFICATE_AUTHORITIES],
        certificate: defaultValues[ConfigKey.TLS_CERTIFICATE],
        key: defaultValues[ConfigKey.TLS_KEY],
        keyPassphrase: defaultValues[ConfigKey.TLS_KEY_PASSPHRASE],
        verificationMode: defaultValues[ConfigKey.TLS_VERIFICATION_MODE],
        version: defaultValues[ConfigKey.TLS_VERSION],
      }}
      onChange={handleOnChange}
      tlsRole="client"
    />
  ) : null;
};
