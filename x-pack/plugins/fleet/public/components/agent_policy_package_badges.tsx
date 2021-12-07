/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiText, EuiFlexGroup, EuiFlexItem, EuiBadge, EuiCallOut } from '@elastic/eui';

import { FLEET_SERVER_PACKAGE } from '../../common/constants';

import type { PackagePolicy, PackagePolicyPackage } from '../types';
import { useGetOneAgentPolicy } from '../hooks';
import { PackageIcon } from '../components';

interface Props {
  agentPolicyId: string;
  hideTitle?: boolean;
  excludeFleetServer?: boolean;
}

export const AgentPolicyPackageBadges: React.FunctionComponent<Props> = ({
  agentPolicyId,
  hideTitle,
  excludeFleetServer,
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

  const showFleetServerWarning = useMemo(
    () => excludeFleetServer && packages?.some((pkg) => pkg.name === FLEET_SERVER_PACKAGE),
    [packages, excludeFleetServer]
  );

  const collectedIntegrationsCount = useMemo(
    () =>
      packages
        ? packages.filter((pkg) => !excludeFleetServer || pkg.name !== FLEET_SERVER_PACKAGE).length
        : 0,
    [packages, excludeFleetServer]
  );

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
                count: collectedIntegrationsCount,
                countValue: <b>{collectedIntegrationsCount}</b>,
              }}
            />
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center" wrap>
        {packages.map((pkg, idx) => {
          return (
            <EuiFlexItem grow={false}>
              <EuiBadge
                key={idx}
                color="hollow"
                isDisabled={excludeFleetServer && pkg.name === FLEET_SERVER_PACKAGE}
              >
                <EuiFlexGroup
                  direction="row"
                  gutterSize="xs"
                  alignItems="center"
                  responsive={false}
                >
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
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      {showFleetServerWarning && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            size="s"
            color="warning"
            iconType="alert"
            title={i18n.translate(
              'xpack.fleet.agentReassignPolicy.packageBadgeFleetServerWarning',
              {
                defaultMessage: 'Fleet Server will not be enabled in standalone mode.',
              }
            )}
          />
        </>
      )}
    </>
  );
};
