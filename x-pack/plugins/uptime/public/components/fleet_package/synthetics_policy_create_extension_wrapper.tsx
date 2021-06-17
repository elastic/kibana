/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { PackagePolicyCreateExtensionComponentProps } from '../../../../fleet/public';
import { SyntheticsPolicyCreateExtension } from './synthetics_policy_create_extension';
import {
  MonitorTypeContextProvider,
  TCPContextProvider,
  ICMPSimpleFieldsContextProvider,
  HTTPContextProvider,
  TLSFieldsContextProvider,
} from './contexts';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyCreateExtensionWrapper = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    return (
      <MonitorTypeContextProvider>
        <HTTPContextProvider>
          <TCPContextProvider>
            <TLSFieldsContextProvider>
              <ICMPSimpleFieldsContextProvider>
                <SyntheticsPolicyCreateExtension newPolicy={newPolicy} onChange={onChange} />
              </ICMPSimpleFieldsContextProvider>
            </TLSFieldsContextProvider>
          </TCPContextProvider>
        </HTTPContextProvider>
      </MonitorTypeContextProvider>
    );
  }
);
SyntheticsPolicyCreateExtensionWrapper.displayName = 'SyntheticsPolicyCreateExtensionWrapper';
