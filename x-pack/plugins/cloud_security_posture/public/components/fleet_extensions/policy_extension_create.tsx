/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiForm } from '@elastic/eui';
import type { PackagePolicyCreateExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { CLOUDBEAT_AWS, CLOUDBEAT_EKS, CLOUDBEAT_INTEGRATION } from '../../../common/constants';
import { DeploymentTypeSelect } from './deployment_type_select';
import { EksFormWrapper } from './eks_form';
import {
  getEnabledInput,
  getEnabledInputType,
  getUpdatedDeploymentType,
  getUpdatedEksVar,
} from './utils';

export const CspCreatePolicyExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    const selectedDeploymentType = getEnabledInputType(newPolicy.inputs);
    const selectedInput = getEnabledInput(newPolicy.inputs);
    const policyTemplate = selectedInput?.policy_template;
    const updateDeploymentType = (inputType: CLOUDBEAT_INTEGRATION) =>
      onChange(getUpdatedDeploymentType(newPolicy, inputType));

    const updateEksVar = (key: string, value: string) =>
      onChange(getUpdatedEksVar(newPolicy, key, value));

    return (
      <EuiForm style={{ marginTop: 0 }}>
        {selectedInput && (policyTemplate === 'kspm' || policyTemplate === 'cspm') && (
          <>
            <DeploymentTypeSelect
              policyTemplate={policyTemplate}
              type={selectedDeploymentType}
              onChange={updateDeploymentType}
            />
            {(selectedDeploymentType === CLOUDBEAT_EKS ||
              selectedDeploymentType === CLOUDBEAT_AWS) && (
              <EksFormWrapper inputs={newPolicy.inputs} onChange={updateEksVar} />
            )}
          </>
        )}
      </EuiForm>
    );
  }
);

CspCreatePolicyExtension.displayName = 'CspCreatePolicyExtension';

// eslint-disable-next-line import/no-default-export
export { CspCreatePolicyExtension as default };
