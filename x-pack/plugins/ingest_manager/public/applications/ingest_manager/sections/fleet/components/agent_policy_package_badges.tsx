/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiText, EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { PackagePolicy } from '../../../types';
import { useGetOneAgentPolicy } from '../../../hooks';
import { PackageIcon } from '../../../components/package_icon';

interface Props {
  agentPolicyId: string;
}

export const AgentPolicyPackageBadges: React.FunctionComponent<Props> = ({ agentPolicyId }) => {
  const agentPolicyRequest = useGetOneAgentPolicy(agentPolicyId);
  const agentPolicy = agentPolicyRequest.data ? agentPolicyRequest.data.item : null;

  if (!agentPolicy) {
    return null;
  }
  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.ingestManager.agentReassignPolicy.policyDescription"
          defaultMessage="The selected agent policy will collect data for {count, plural, one {{countValue} integration} other {{countValue} integrations}}:"
          values={{
            count: agentPolicy.package_policies.length,
            countValue: <b>{agentPolicy.package_policies.length}</b>,
          }}
        />
      </EuiText>
      <EuiSpacer size="s" />
      {(agentPolicy.package_policies as PackagePolicy[]).map((packagePolicy, idx) => {
        if (!packagePolicy.package) {
          return null;
        }
        return (
          <EuiBadge key={idx} color="hollow">
            <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <PackageIcon
                  packageName={packagePolicy.package.name}
                  version={packagePolicy.package.version}
                  size="s"
                  tryApi={true}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{packagePolicy.package.title}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiBadge>
        );
      })}
    </>
  );
};
