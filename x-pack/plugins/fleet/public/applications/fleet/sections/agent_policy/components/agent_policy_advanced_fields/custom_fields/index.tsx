/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup, EuiSpacer, EuiCallOut } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import type {
  NewAgentPolicy,
  AgentPolicy,
  PackagePolicy,
  PackagePolicyInput,
} from '../../../../../types';

import { GLOBAL_DATA_TAG_EXCLUDED_INPUTS } from '../../../../../../../../common/constants';

import { GlobalDataTagsTable } from './global_data_tags_table';

interface Props {
  agentPolicy: Partial<AgentPolicy | NewAgentPolicy>;
  updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
}

export const CustomFields: React.FunctionComponent<Props> = ({
  agentPolicy,
  updateAgentPolicy,
}) => {
  const isAgentPolicy = (policy: Partial<AgentPolicy | NewAgentPolicy>): policy is AgentPolicy => {
    return (policy as AgentPolicy).package_policies !== undefined;
  };

  const findUnsupportedInputs = (
    policy: Partial<AgentPolicy | NewAgentPolicy>,
    excludedInputs: Set<string>
  ): string[] => {
    if (!isAgentPolicy(policy)) {
      return [];
    }

    const found = new Set<string>([]);
    policy.package_policies?.forEach((p: PackagePolicy) => {
      p.inputs.forEach((input: PackagePolicyInput) => {
        if (excludedInputs.has(input.type)) {
          found.add(input.type);
        }
      });
    });
    return Array.from(found);
  };

  const unsupportedInputs = findUnsupportedInputs(agentPolicy, GLOBAL_DATA_TAG_EXCLUDED_INPUTS);

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <h3>
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.globalDataTagHeader"
            defaultMessage="Custom fields"
          />
        </h3>
      }
      description={
        <>
          <FormattedMessage
            id="xpack.fleet.agentPolicyForm.globalDataTagDescription"
            defaultMessage="Add a field and value set to all data collected from the agents enrolled in this policy."
          />
          {unsupportedInputs.length > 0 ? (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.fleet.agentPolicyForm.globalDataTagUnsupportedInputTitle"
                    defaultMessage="Unsupported Inputs"
                  />
                }
                color="warning"
                iconType="alert"
                size="s"
              >
                <p>
                  <FormattedMessage
                    id="xpack.fleet.agentPolicyForm.globalDataTagUnsupportedInputMessage"
                    defaultMessage="Tagging data collected from {inputCount, plural, one {input {inputs} is} other {inputs {inputs} are}} not supported."
                    values={{
                      inputCount: unsupportedInputs.length,
                      inputs: <strong>{unsupportedInputs.join(', ')}</strong>,
                    }}
                  />
                </p>
              </EuiCallOut>
            </>
          ) : null}
        </>
      }
    >
      <GlobalDataTagsTable
        updateAgentPolicy={updateAgentPolicy}
        globalDataTags={agentPolicy.global_data_tags ? agentPolicy.global_data_tags : []}
      />
    </EuiDescribedFormGroup>
  );
};
