/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiForm } from '@elastic/eui';
import type { PackagePolicyEditExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { CLOUDBEAT_EKS } from '../../../common/constants';
import { DeploymentTypeSelect } from './deployment_type_select';
import { EksFormWrapper } from './eks_form';
import { getEnabledInputType, getUpdatedEksVar } from './utils';

export const CspEditPolicyExtension = memo<PackagePolicyEditExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    const selectedDeploymentType = getEnabledInputType(newPolicy.inputs);

    const updateEksVar = (key: string, value: string) =>
      onChange(getUpdatedEksVar(newPolicy, key, value));

    return (
      <EuiForm>
        <DeploymentTypeSelect type={selectedDeploymentType} isDisabled />
        {selectedDeploymentType === CLOUDBEAT_EKS && (
          <EksFormWrapper inputs={newPolicy.inputs} onChange={updateEksVar} />
        )}
      </EuiForm>
    );
  }
);

CspEditPolicyExtension.displayName = 'CspEditPolicyExtension';

// eslint-disable-next-line import/no-default-export
export { CspEditPolicyExtension as default };
