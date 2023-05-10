/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PackagePolicyReplaceDefineStepExtensionComponentProps } from '@kbn/fleet-plugin/public';
import React, { memo } from 'react';
import { PolicySettings } from '../policy_settings';

export const CloudDefendFleetPolicyExtension =
  memo<PackagePolicyReplaceDefineStepExtensionComponentProps>(
    (props: PackagePolicyReplaceDefineStepExtensionComponentProps) => {
      return <PolicySettings {...props} />;
    }
  );

CloudDefendFleetPolicyExtension.displayName = 'CloudDefendFleetPolicyExtension';

// eslint-disable-next-line import/no-default-export
export { CloudDefendFleetPolicyExtension as default };
