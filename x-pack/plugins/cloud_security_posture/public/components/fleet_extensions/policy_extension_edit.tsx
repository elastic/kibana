/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiForm } from '@elastic/eui';
import type { PackagePolicyEditExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { CLOUDBEAT_EKS, CLOUDBEAT_AWS } from '../../../common/constants';
import { DeploymentTypeSelect } from './deployment_type_select';
import { EksFormWrapper } from './eks_form';
import { getEnabledInput, getEnabledInputType, getUpdatedEksVar } from './utils';

export const CspEditPolicyExtension = memo<PackagePolicyEditExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    const selectedDeploymentType = getEnabledInputType(newPolicy.inputs);
    const selectedInput = getEnabledInput(newPolicy.inputs);
    const policyTemplate = selectedInput?.policy_template;

    const updateEksVar = (key: string, value: string) =>
      onChange(getUpdatedEksVar(newPolicy, key, value));

    return (
      <EuiForm style={{ marginTop: 0 }}>
        {(policyTemplate === 'kspm' || policyTemplate === 'cspm') && (
          <>
            <DeploymentTypeSelect
              policyTemplate={policyTemplate}
              type={selectedDeploymentType}
              isDisabled
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

CspEditPolicyExtension.displayName = 'CspEditPolicyExtension';

// eslint-disable-next-line import/no-default-export
export { CspEditPolicyExtension as default };
