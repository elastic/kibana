/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';

import { TLSOptions, TLSConfig } from './common/tls_options';
import { useTLSFieldsContext, usePolicyConfigContext } from './contexts';

import { ConfigKeys } from './types';

export const TLSFields = () => {
  const { defaultValues, setFields } = useTLSFieldsContext();
  const { isTLSEnabled } = usePolicyConfigContext();

  const handleOnChange = useCallback(
    (tlsConfig: TLSConfig) => {
      setFields({
        [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: tlsConfig.certificateAuthorities,
        [ConfigKeys.TLS_CERTIFICATE]: tlsConfig.certificate,
        [ConfigKeys.TLS_KEY]: tlsConfig.key,
        [ConfigKeys.TLS_KEY_PASSPHRASE]: tlsConfig.keyPassphrase,
        [ConfigKeys.TLS_VERIFICATION_MODE]: tlsConfig.verificationMode,
        [ConfigKeys.TLS_VERSION]: tlsConfig.version,
      });
    },
    [setFields]
  );

  useEffect(() => {
    if (!isTLSEnabled) {
      setFields({
        [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: undefined,
        [ConfigKeys.TLS_CERTIFICATE]: undefined,
        [ConfigKeys.TLS_KEY]: undefined,
        [ConfigKeys.TLS_KEY_PASSPHRASE]: undefined,
        [ConfigKeys.TLS_VERIFICATION_MODE]: undefined,
        [ConfigKeys.TLS_VERSION]: undefined,
      });
    }
  }, [setFields, isTLSEnabled]);

  return isTLSEnabled ? (
    <TLSOptions
      defaultValues={{
        certificateAuthorities: defaultValues[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES],
        certificate: defaultValues[ConfigKeys.TLS_CERTIFICATE],
        key: defaultValues[ConfigKeys.TLS_KEY],
        keyPassphrase: defaultValues[ConfigKeys.TLS_KEY_PASSPHRASE],
        verificationMode: defaultValues[ConfigKeys.TLS_VERIFICATION_MODE],
        version: defaultValues[ConfigKeys.TLS_VERSION],
      }}
      onChange={handleOnChange}
      tlsRole="client"
    />
  ) : null;
};
