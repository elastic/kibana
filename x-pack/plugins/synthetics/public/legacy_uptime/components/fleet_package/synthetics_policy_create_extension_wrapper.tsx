/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { PackagePolicyCreateExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { SyntheticsPolicyCreateExtension } from './synthetics_policy_create_extension';
import { SyntheticsProviders } from './contexts';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyCreateExtensionWrapper =
  memo<PackagePolicyCreateExtensionComponentProps>(({ newPolicy, onChange }) => {
    return (
      <SyntheticsProviders>
        <SyntheticsPolicyCreateExtension newPolicy={newPolicy} onChange={onChange} />
      </SyntheticsProviders>
    );
  });
SyntheticsPolicyCreateExtensionWrapper.displayName = 'SyntheticsPolicyCreateExtensionWrapper';
