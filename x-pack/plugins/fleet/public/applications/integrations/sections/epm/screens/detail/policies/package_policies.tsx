/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stringify, parse } from 'query-string';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Redirect, useLocation, useHistory } from 'react-router-dom';
import type { CriteriaWithPagination, EuiTableFieldDataColumnType } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative, FormattedMessage } from '@kbn/i18n-react';

import { policyHasFleetServer } from '../../../../../../../../common/services';

import { InstallStatus } from '../../../../../types';
import type { GetAgentPoliciesResponseItem, InMemoryPackagePolicy } from '../../../../../types';
import {
  useLink,
  useUrlPagination,
  useGetPackageInstallStatus,
  AgentPolicyRefreshContext,
  useIsPackagePolicyUpgradable,
  useAuthz,
  useMultipleAgentPolicies,
} from '../../../../../hooks';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../../constants';
import {
  AgentEnrollmentFlyout,
  MultipleAgentPoliciesSummaryLine,
  AgentPolicySummaryLine,
  PackagePolicyActionsMenu,
} from '../../../../../components';
import { SideBarColumn } from '../../../components/side_bar_column';

import { PackagePolicyAgentsCell } from './components/package_policy_agents_cell';
import { usePackagePoliciesWithAgentPolicy } from './use_package_policies_with_agent_policy';
import { Persona } from './persona';

interface PackagePoliciesPanelProps {
  name: string;
  version: string;
}

interface InMemoryPackagePolicyAndAgentPolicy {
  packagePolicy: InMemoryPackagePolicy;
  agentPolicies: GetAgentPoliciesResponseItem[];
}

const IntegrationDetailsLink = memo<{
  packagePolicy: InMemoryPackagePolicyAndAgentPolicy['packagePolicy'];
  agentPolicies: InMemoryPackagePolicyAndAgentPolicy['agentPolicies'];
}>(({ packagePolicy }) => {
  const { getHref } = useLink();
  return (
    <EuiLink
      className="eui-textTruncate"
      data-test-subj="integrationNameLink"
      href={getHref('integration_policy_edit', {
        packagePolicyId: packagePolicy.id,
      })}
    >
      {packagePolicy.name}
    </EuiLink>
  );
});

export const PackagePoliciesPage = ({ name, version }: PackagePoliciesPanelProps) => {
  const { search } = useLocation();
  const history = useHistory();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const agentPolicyIdFromParams = useMemo(
    () => queryParams.get('addAgentToPolicyId'),
    [queryParams]
  );
  const showAddAgentHelpForPolicyId = useMemo(
    () => queryParams.get('showAddAgentHelpForPolicyId'),
    [queryParams]
  );
  const [flyoutOpenForPolicyId, setFlyoutOpenForPolicyId] = useState<string | null>(
    agentPolicyIdFromParams
  );
  const { getPath, getHref } = useLink();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const packageInstallStatus = getPackageInstallStatus(name);
  const { pagination, pageSizeOptions, setPagination } = useUrlPagination();
  const { canUseMultipleAgentPolicies } = useMultipleAgentPolicies();

  const {
    data,
    isLoading,
    resendRequest: refreshPolicies,
  } = usePackagePoliciesWithAgentPolicy({
    page: pagination.currentPage,
    perPage: pagination.pageSize,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: ${name}`,
  });
  const { isPackagePolicyUpgradable } = useIsPackagePolicyUpgradable();

  const canWriteIntegrationPolicies = useAuthz().integrations.writeIntegrationPolicies;
  const canReadIntegrationPolicies = useAuthz().integrations.readIntegrationPolicies;
  const canAddAgents = useAuthz().fleet.addAgents;
  const canAddFleetServers = useAuthz().fleet.addFleetServers;
  const canReadAgentPolicies = useAuthz().fleet.readAgentPolicies;

  const packageAndAgentPolicies = useMemo((): Array<{
    agentPolicies: GetAgentPoliciesResponseItem[];
    packagePolicy: InMemoryPackagePolicy;
  }> => {
    if (!data?.items) {
      return [];
    }

    const newPolicies = data.items.map(({ agentPolicies, packagePolicy }) => {
      const hasUpgrade = isPackagePolicyUpgradable(packagePolicy);

      return {
        agentPolicies,
        packagePolicy: {
          ...packagePolicy,
          hasUpgrade,
        },
      };
    });

    return newPolicies;
  }, [data?.items, isPackagePolicyUpgradable]);

  const showAddAgentHelpForPackagePolicyId = packageAndAgentPolicies.find(({ agentPolicies }) =>
    agentPolicies.find((agentPolicy) => agentPolicy.id === showAddAgentHelpForPolicyId)
  )?.packagePolicy?.id;
  // Handle the "add agent" link displayed in post-installation toast notifications in the case
  // where a user is clicking the link while on the package policies listing page
  useEffect(() => {
    const unlisten = history.listen((location) => {
      const params = new URLSearchParams(location.search);
      const addAgentToPolicyId = params.get('addAgentToPolicyId');

      if (addAgentToPolicyId) {
        setFlyoutOpenForPolicyId(addAgentToPolicyId);
      }
    });

    return () => unlisten();
  }, [history]);

  const handleTableOnChange = useCallback(
    ({ page }: CriteriaWithPagination<InMemoryPackagePolicyAndAgentPolicy>) => {
      setPagination({
        currentPage: page.index + 1,
        pageSize: page.size,
      });
    },
    [setPagination]
  );
  const canShowMultiplePoliciesCell =
    canUseMultipleAgentPolicies && canReadIntegrationPolicies && canReadAgentPolicies;
  const columns: Array<EuiTableFieldDataColumnType<InMemoryPackagePolicyAndAgentPolicy>> = useMemo(
    () => [
      {
        field: 'packagePolicy.name',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.name', {
          defaultMessage: 'Integration policy',
        }),
        render(_, { agentPolicies, packagePolicy }) {
          return (
            <IntegrationDetailsLink packagePolicy={packagePolicy} agentPolicies={agentPolicies} />
          );
        },
      },
      {
        field: 'packagePolicy.package.version',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.version', {
          defaultMessage: 'Version',
        }),
        render(_version, { agentPolicies, packagePolicy }) {
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" wrap={true}>
              <EuiFlexItem grow={false}>
                <EuiText size="s" className="eui-textNoWrap" data-test-subj="packageVersionText">
                  <FormattedMessage
                    id="xpack.fleet.epm.packageDetails.integrationList.packageVersion"
                    defaultMessage="v{version}"
                    values={{ version: _version }}
                  />
                </EuiText>
              </EuiFlexItem>

              {agentPolicies.length > 0 && packagePolicy.hasUpgrade && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    minWidth="0"
                    href={`${getHref('upgrade_package_policy', {
                      policyId: agentPolicies[0].id,
                      packagePolicyId: packagePolicy.id,
                    })}?from=integrations-policy-list`}
                    data-test-subj="integrationPolicyUpgradeBtn"
                    isDisabled={!canWriteIntegrationPolicies}
                  >
                    <FormattedMessage
                      id="xpack.fleet.policyDetails.packagePoliciesTable.upgradeButton"
                      defaultMessage="Upgrade"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'packagePolicy.policy_ids',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.agentPolicy', {
          defaultMessage: 'Agent policies',
        }),
        truncateText: true,
        render(ids, { agentPolicies, packagePolicy }) {
          return agentPolicies.length > 0 ? (
            canShowMultiplePoliciesCell ? (
              <MultipleAgentPoliciesSummaryLine
                policies={agentPolicies}
                packagePolicyId={packagePolicy.id}
                onAgentPoliciesChange={refreshPolicies}
              />
            ) : (
              <AgentPolicySummaryLine policy={agentPolicies[0]} />
            )
          ) : ids.length === 0 ? (
            <EuiText color="subdued" size="xs">
              <FormattedMessage
                id="xpack.fleet.epm.packageDetails.integrationList.noAgentPolicies"
                defaultMessage="No agent policies"
              />
            </EuiText>
          ) : (
            <EuiText color="subdued" size="xs">
              <EuiIcon size="m" type="warning" color="warning" />
              &nbsp;
              <FormattedMessage
                id="xpack.fleet.epm.packageDetails.integrationList.agentPolicyDeletedWarning"
                defaultMessage="Policy not found"
              />
            </EuiText>
          );
        },
      },
      {
        field: 'packagePolicy.updated_by',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.updatedBy', {
          defaultMessage: 'Last updated by',
        }),
        truncateText: true,
        render(updatedBy) {
          return <Persona size="s" name={updatedBy} title={updatedBy} />;
        },
      },
      {
        field: 'packagePolicy.updated_at',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.updatedAt', {
          defaultMessage: 'Last updated',
        }),
        truncateText: true,
        render(updatedAt: InMemoryPackagePolicyAndAgentPolicy['packagePolicy']['updated_at']) {
          return (
            <span className="eui-textTruncate" title={updatedAt}>
              <FormattedRelative value={updatedAt} />
            </span>
          );
        },
      },
      {
        field: '',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.agentCount', {
          defaultMessage: 'Agents',
        }),
        render({ agentPolicies, packagePolicy }: InMemoryPackagePolicyAndAgentPolicy) {
          if (agentPolicies.length === 0) {
            return (
              <EuiText color="subdued" size="xs">
                <FormattedMessage
                  id="xpack.fleet.epm.packageDetails.integrationList.noAgents"
                  defaultMessage="No agents"
                />
              </EuiText>
            );
          }
          const agentPolicy = agentPolicies[0]; // TODO: handle multiple agent policies
          const canAddAgentsForPolicy = policyHasFleetServer(agentPolicy)
            ? canAddFleetServers
            : canAddAgents;
          return (
            <PackagePolicyAgentsCell
              agentPolicy={agentPolicy}
              agentCount={agentPolicy.agents}
              onAddAgent={() => setFlyoutOpenForPolicyId(agentPolicy.id)}
              canAddAgents={canAddAgentsForPolicy}
              hasHelpPopover={showAddAgentHelpForPackagePolicyId === packagePolicy.id}
            />
          );
        },
      },
      {
        field: '',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.actions', {
          defaultMessage: 'Actions',
        }),
        width: '8ch',
        align: 'right',
        render({ agentPolicies, packagePolicy }) {
          const agentPolicy = agentPolicies[0]; // TODO: handle multiple agent policies
          return (
            <PackagePolicyActionsMenu
              agentPolicies={agentPolicies}
              packagePolicy={packagePolicy}
              showAddAgent={true}
              upgradePackagePolicyHref={
                agentPolicy
                  ? `${getHref('upgrade_package_policy', {
                      policyId: agentPolicy.id,
                      packagePolicyId: packagePolicy.id,
                    })}?from=integrations-policy-list`
                  : undefined
              }
            />
          );
        },
      },
    ],
    [
      getHref,
      canWriteIntegrationPolicies,
      canShowMultiplePoliciesCell,
      canAddFleetServers,
      canAddAgents,
      showAddAgentHelpForPackagePolicyId,
      refreshPolicies,
    ]
  );

  const noItemsMessage = useMemo(() => {
    return isLoading ? (
      <FormattedMessage
        id="xpack.fleet.epm.packageDetails.integrationList.loadingPoliciesMessage"
        defaultMessage="Loading integration policies…"
      />
    ) : undefined;
  }, [isLoading]);

  const tablePagination = useMemo(() => {
    return {
      pageIndex: pagination.currentPage - 1,
      pageSize: pagination.pageSize,
      totalItemCount: data?.total ?? 0,
      pageSizeOptions,
    };
  }, [data?.total, pageSizeOptions, pagination.currentPage, pagination.pageSize]);

  // if they arrive at this page and the package is not installed, send them to overview
  // this happens if they arrive with a direct url or they uninstall while on this tab
  // Check flyoutOpenForPolicyId otherwise right after installing a new integration the flyout won't open
  if (packageInstallStatus.status !== InstallStatus.installed && !flyoutOpenForPolicyId) {
    return (
      <Redirect to={getPath('integration_details_overview', { pkgkey: `${name}-${version}` })} />
    );
  }
  const selectedPolicies = packageAndAgentPolicies.find(({ agentPolicies: policies }) =>
    policies.find((policy) => policy.id === flyoutOpenForPolicyId)
  );
  const agentPolicies = selectedPolicies?.agentPolicies;
  const packagePolicy = selectedPolicies?.packagePolicy;

  return (
    <AgentPolicyRefreshContext.Provider value={{ refresh: refreshPolicies }}>
      <EuiFlexGroup alignItems="flexStart">
        <SideBarColumn grow={1} />
        <EuiFlexItem grow={7}>
          <EuiBasicTable
            items={packageAndAgentPolicies || []}
            columns={columns}
            loading={isLoading}
            data-test-subj="integrationPolicyTable"
            pagination={tablePagination}
            onChange={handleTableOnChange}
            noItemsMessage={noItemsMessage}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {flyoutOpenForPolicyId && agentPolicies && !isLoading && (
        <AgentEnrollmentFlyout
          onClose={() => {
            setFlyoutOpenForPolicyId(null);
            const { addAgentToPolicyId, ...rest } = parse(search);
            history.replace({ search: stringify(rest) });
          }}
          agentPolicy={agentPolicies[0]}
          isIntegrationFlow={true}
          installedPackagePolicy={{
            name: packagePolicy?.package?.name || '',
            version: packagePolicy?.package?.version || '',
          }}
        />
      )}
    </AgentPolicyRefreshContext.Provider>
  );
};
