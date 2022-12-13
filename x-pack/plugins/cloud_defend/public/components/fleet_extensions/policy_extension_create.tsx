/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import type { PackagePolicyCreateExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { PolicySettings } from '../policy_settings';

export const CloudDefendCreatePolicyExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    return <PolicySettings policy={newPolicy} onChange={onChange} />;
  }
);

CloudDefendCreatePolicyExtension.displayName = 'CloudDefendCreatePolicyExtension';

// eslint-disable-next-line import/no-default-export
export { CloudDefendCreatePolicyExtension as default };
