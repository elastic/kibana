/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { PackagePolicyEditExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { usePolicyConfigContext } from './contexts';
import { MonitorFields, PolicyConfig } from './types';
import { CustomFields } from './custom_fields';
import { useUpdatePolicy } from './hooks/use_update_policy';
import { usePolicy } from './hooks/use_policy';
import { validate } from './validation';

interface SyntheticsPolicyEditExtensionProps {
  newPolicy: PackagePolicyEditExtensionComponentProps['newPolicy'];
  onChange: PackagePolicyEditExtensionComponentProps['onChange'];
  defaultConfig: Partial<MonitorFields>;
}

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Fleet app create / edit package policy
 */
export const SyntheticsPolicyEditExtension = memo<SyntheticsPolicyEditExtensionProps>(
  ({ newPolicy, onChange, defaultConfig }) => {
    useTrackPageview({ app: 'fleet', path: 'syntheticsEdit' });
    useTrackPageview({ app: 'fleet', path: 'syntheticsEdit', delay: 15000 });

    const { monitorType } = usePolicyConfigContext();
    const policyConfig: PolicyConfig = usePolicy(newPolicy.name);

    useUpdatePolicy({
      defaultConfig,
      config: policyConfig[monitorType],
      newPolicy,
      onChange,
      validate,
      monitorType,
    });

    return <CustomFields validate={validate[monitorType]} />;
  }
);
SyntheticsPolicyEditExtension.displayName = 'SyntheticsPolicyEditExtension';
