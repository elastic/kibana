/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { PackagePolicyCreateExtensionComponentProps } from '../../../../fleet/public';
import { useTrackPageview } from '../../../../observability/public';
import {
  PolicyConfig,
  DataStream,
  ConfigKeys,
  HTTPFields,
  TCPFields,
  ICMPFields,
  BrowserFields,
} from '../types';
import {
  usePolicyConfigContext,
  useTCPSimpleFieldsContext,
  useTCPAdvancedFieldsContext,
  useICMPSimpleFieldsContext,
  useHTTPSimpleFieldsContext,
  useHTTPAdvancedFieldsContext,
  useTLSFieldsContext,
  useBrowserSimpleFieldsContext,
  useBrowserAdvancedFieldsContext,
  defaultHTTPAdvancedFields,
  defaultHTTPSimpleFields,
  defaultICMPSimpleFields,
  defaultTCPSimpleFields,
  defaultTCPAdvancedFields,
  defaultBrowserSimpleFields,
  defaultBrowserAdvancedFields,
  defaultTLSFields,
} from '../contexts';

export const defaultConfig: PolicyConfig = {
  [DataStream.HTTP]: {
    ...defaultHTTPSimpleFields,
    ...defaultHTTPAdvancedFields,
    ...defaultTLSFields,
  },
  [DataStream.TCP]: {
    ...defaultTCPSimpleFields,
    ...defaultTCPAdvancedFields,
    ...defaultTLSFields,
  },
  [DataStream.ICMP]: defaultICMPSimpleFields,
  [DataStream.BROWSER]: {
    ...defaultBrowserSimpleFields,
    ...defaultBrowserAdvancedFields,
    ...defaultTLSFields,
  },
};

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const usePolicy = (name: string) => {
  const { isTLSEnabled, isZipUrlTLSEnabled } = usePolicyConfigContext();
  const { fields: httpSimpleFields } = useHTTPSimpleFieldsContext();
  const { fields: tcpSimpleFields } = useTCPSimpleFieldsContext();
  const { fields: icmpSimpleFields } = useICMPSimpleFieldsContext();
  const { fields: browserSimpleFields } = useBrowserSimpleFieldsContext();
  const { fields: httpAdvancedFields } = useHTTPAdvancedFieldsContext();
  const { fields: tcpAdvancedFields } = useTCPAdvancedFieldsContext();
  const { fields: browserAdvancedFields } = useBrowserAdvancedFieldsContext();
  const { fields: tlsFields } = useTLSFieldsContext();

  const metadata = useMemo(
    () => ({
      is_tls_enabled: isTLSEnabled,
      is_zip_url_tls_enabled: isZipUrlTLSEnabled,
    }),
    [isTLSEnabled, isZipUrlTLSEnabled]
  );

  const policyConfig: PolicyConfig = useMemo(
    () => ({
      [DataStream.HTTP]: {
        ...httpSimpleFields,
        ...httpAdvancedFields,
        ...tlsFields,
        [ConfigKeys.METADATA]: {
          ...metadata,
          ...httpSimpleFields[ConfigKeys.METADATA],
        },
        [ConfigKeys.NAME]: name,
      } as HTTPFields,
      [DataStream.TCP]: {
        ...tcpSimpleFields,
        ...tcpAdvancedFields,
        ...tlsFields,
        [ConfigKeys.METADATA]: {
          ...metadata,
          ...tcpSimpleFields[ConfigKeys.METADATA],
        },
        [ConfigKeys.NAME]: name,
      } as TCPFields,
      [DataStream.ICMP]: {
        ...icmpSimpleFields,
        [ConfigKeys.NAME]: name,
      } as ICMPFields,
      [DataStream.BROWSER]: {
        ...browserSimpleFields,
        ...browserAdvancedFields,
        [ConfigKeys.METADATA]: {
          ...metadata,
          ...browserSimpleFields[ConfigKeys.METADATA],
        },
        [ConfigKeys.NAME]: name,
      } as BrowserFields,
    }),
    [
      metadata,
      httpSimpleFields,
      httpAdvancedFields,
      tcpSimpleFields,
      tcpAdvancedFields,
      icmpSimpleFields,
      browserSimpleFields,
      browserAdvancedFields,
      tlsFields,
      name,
    ]
  );

  return policyConfig;
};
