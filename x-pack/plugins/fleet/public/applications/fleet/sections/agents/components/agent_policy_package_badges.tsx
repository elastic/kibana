/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiText, EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';

import type { PackagePolicy, PackagePolicyPackage } from '../../../types';
import { useGetOneAgentPolicy } from '../../../hooks';
import { PackageIcon } from '../../../components/package_icon';

interface Props {
  agentPolicyId: string;
  hideTitle?: boolean;
}

export const AgentPolicyPackageBadges: React.FunctionComponent<Props> = ({
  agentPolicyId,
  hideTitle,
}) => {
  const agentPolicyRequest = useGetOneAgentPolicy(agentPolicyId);
  const agentPolicy = agentPolicyRequest.data ? agentPolicyRequest.data.item : null;

  const packages = useMemo(() => {
    if (!agentPolicy) {
      return;
    }

    const uniquePackages = new Map<string, PackagePolicyPackage>();

    (agentPolicy.package_policies as PackagePolicy[]).forEach(({ package: pkg }) => {
      if (!pkg) {
        return;
      }

      if (!uniquePackages.has(pkg.name) || uniquePackages.get(pkg.name)!.version < pkg.version) {
        uniquePackages.set(pkg.name, pkg);
      }
    });

    return [...uniquePackages.values()];
  }, [agentPolicy]);

  if (!agentPolicy || !packages) {
    return null;
  }

  return (
    <>
      {!hideTitle && (
        <>
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentReassignPolicy.policyDescription"
              defaultMessage="The selected agent policy will collect data for {count, plural, one {{countValue} integration} other {{countValue} integrations}}:"
              values={{
                count: packages.length,
                countValue: <b>{packages.length}</b>,
              }}
            />
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}
      {packages.map((pkg, idx) => {
        return (
          <EuiBadge key={idx} color="hollow">
            <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <PackageIcon
                  packageName={pkg.name}
                  version={pkg.version}
                  tryApi={true}
                  style={
                    // when a custom SVG is used the logo is rendered with <img class="euiIcon euiIcon--small">
                    // this collides with some EuiText (+img) CSS from the EuiIcon component
                    // which  makes the button large, wide, and poorly layed out
                    // override those styles until the bug is fixed or we find a better approach
                    { margin: 'unset', width: '16px' }
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{pkg.title}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiBadge>
        );
      })}
    </>
  );
};
