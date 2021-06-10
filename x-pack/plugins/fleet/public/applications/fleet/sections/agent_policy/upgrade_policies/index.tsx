/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { EuiTableActionsColumnType, EuiTableFieldDataColumnType } from '@elastic/eui';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStepsHorizontal,
  EuiPageContent,
  EuiCheckbox,
  EuiPanel,
  EuiLoadingContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { WithHeaderLayout } from '../../../layouts';
import { useBreadcrumbs, usePackageInstallations } from '../../../hooks';

const maxWidth = 770;

const UpgradePoliciesPageLayout: React.FunctionComponent = ({ children }) => (
  <WithHeaderLayout
    restrictHeaderWidth={maxWidth}
    restrictWidth={maxWidth}
    leftColumn={
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.fleet.upgradePolicies.pageTitle"
                defaultMessage="Upgrade policies"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStepsHorizontal
            steps={[
              {
                title: i18n.translate('xpack.fleet.upgradePolicies.selectPoliciesStepTitle', {
                  defaultMessage: 'Select policies',
                }),
                isComplete: false,
                isSelected: true,
                onClick: () => {},
              },
              {
                title: i18n.translate('xpack.fleet.upgradePolicies.configurePoliciesStepTitle', {
                  defaultMessage: 'Configure policies',
                }),
                isComplete: false,
                isSelected: false,
                onClick: () => {},
              },
              {
                title: i18n.translate('xpack.fleet.upgradePolicies.reviewAndDeployStepTitle', {
                  defaultMessage: 'Review and deploy',
                }),
                isComplete: false,
                isSelected: false,
                onClick: () => {},
              },
            ]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    }
  >
    {children}
  </WithHeaderLayout>
);

export const UpgradePoliciesPage: React.FunctionComponent<{}> = () => {
  useBreadcrumbs('upgrade_policies');

  const [selectedIntegrations, setSelectedIntegrations] = useState<string[] | null>(null);

  const { updatableIntegrations, isLoadingPackages, isLoadingPolicies } = usePackageInstallations();

  const isLoading = useMemo(() => isLoadingPackages || isLoadingPolicies, [
    isLoadingPackages,
    isLoadingPolicies,
  ]);

  const upgradeablePolicies = useMemo(() => {
    const policiesMap = new Map();
    for (const [
      integrationName,
      { currentVersion, policiesToUpgrade },
    ] of updatableIntegrations.entries()) {
      for (const policy of policiesToUpgrade) {
        const policyRecord = policiesMap.get(policy.id) ?? {
          agentsCount: policy.agentsCount,
          name: policy.name,
          integrationsToUpgrade: [],
        };
        policyRecord.integrationsToUpgrade.push({
          pkgName: integrationName,
          pkgPolicyId: policy.pkgPolicyId,
          pkgPolicyName: policy.pkgPolicyName,
          fromVersion: policy.pkgPolicyIntegrationVersion,
          toVersion: currentVersion,
        });
        policiesMap.set(policy.id, policyRecord);
      }
    }
    return policiesMap;
  }, [updatableIntegrations]);

  const onChangePackagePolicies = (policyIDs: string[], shouldCheck: boolean) => {
    if (!selectedIntegrations) return;
    const uniqueIDs = new Set(selectedIntegrations);
    if (shouldCheck) policyIDs.forEach((id) => uniqueIDs.add(id));
    else policyIDs.forEach((id) => uniqueIDs.delete(id));
    setSelectedIntegrations([...uniqueIDs]);
  };

  useEffect(() => {
    if (!selectedIntegrations && !isLoading) {
      const newSelectedIntegrations = [];
      for (const policy of upgradeablePolicies.values()) {
        for (const { pkgPolicyId } of policy.integrationsToUpgrade) {
          newSelectedIntegrations.push(pkgPolicyId);
        }
      }
      setSelectedIntegrations(newSelectedIntegrations);
    }
  }, [selectedIntegrations, isLoading, upgradeablePolicies, setSelectedIntegrations]);

  return (
    <UpgradePoliciesPageLayout>
      <EuiPageContent paddingSize="l" color="subdued">
        {isLoading ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem>
              <EuiLoadingContent lines={4} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <ul>
            {[...upgradeablePolicies.entries()].map(([policyID, policyRecord]) => {
              const pkgPolicyIds = policyRecord.integrationsToUpgrade.map(
                (integration) => integration.pkgPolicyId
              );
              const isChecked = pkgPolicyIds.every((id) => selectedIntegrations?.includes(id));
              const isIndeterminate =
                !isChecked && pkgPolicyIds.some((id) => selectedIntegrations?.includes(id));
              return (
                <li key={policyID}>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiCheckbox
                        id={`policy-${policyID}-checkbox`}
                        onChange={() => onChangePackagePolicies(pkgPolicyIds, !isChecked)}
                        checked={isChecked}
                        indeterminate={isIndeterminate}
                        label={
                          <EuiText>
                            <strong>{policyRecord.name}</strong>
                          </EuiText>
                        }
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText textAlign="center">
                        {i18n.translate(
                          'xpack.fleet.upgradePolicies.policyUpgradesAvailableCount',
                          {
                            defaultMessage:
                              '{count, plural, one {# upgrade} other {# upgrades}} available',
                            values: {
                              count: policyRecord.integrationsToUpgrade.length,
                            },
                          }
                        )}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText textAlign="right">
                        {i18n.translate('xpack.fleet.upgradePolicies.policyUsedByAgents', {
                          defaultMessage: 'used by {count, plural, one {# agent} other {# agents}}',
                          values: {
                            count: policyRecord.agentsCount,
                          },
                        })}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <ul>
                    <EuiPanel hasShadow={false} color="transparent">
                      {policyRecord.integrationsToUpgrade.map((integration) => {
                        const isPkgPolicyChecked = selectedIntegrations?.includes(
                          integration.pkgPolicyId
                        );
                        return (
                          <li key={integration.pkgPolicyId}>
                            <EuiCheckbox
                              id={`pkg-${integration.pkgPolicyId}-checkbox`}
                              checked={isPkgPolicyChecked}
                              onChange={() =>
                                onChangePackagePolicies(
                                  [integration.pkgPolicyId],
                                  !isPkgPolicyChecked
                                )
                              }
                              label={
                                <EuiText>
                                  {integration.pkgPolicyName} {integration.fromVersion} →{' '}
                                  {integration.toVersion}
                                </EuiText>
                              }
                            />
                          </li>
                        );
                      })}
                    </EuiPanel>
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </EuiPageContent>
    </UpgradePoliciesPageLayout>
  );
};
