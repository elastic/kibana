/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stringify, parse } from 'query-string';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Redirect, useLocation, useHistory } from 'react-router-dom';
import type {
  CriteriaWithPagination,
  EuiStepProps,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import {
  EuiBasicTable,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative, FormattedMessage } from '@kbn/i18n-react';

import { InstallStatus } from '../../../../../types';
import type { GetAgentPoliciesResponseItem, InMemoryPackagePolicy } from '../../../../../types';
import {
  useLink,
  useUrlPagination,
  useGetPackageInstallStatus,
  AgentPolicyRefreshContext,
  useUIExtension,
  usePackageInstallations,
  useAuthz,
} from '../../../../../hooks';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../../constants';
import {
  AgentEnrollmentFlyout,
  AgentPolicySummaryLine,
  PackagePolicyActionsMenu,
} from '../../../../../components';

import { PackagePolicyAgentsCell } from './components/package_policy_agents_cell';
import { usePackagePoliciesWithAgentPolicy } from './use_package_policies_with_agent_policy';
import { Persona } from './persona';

interface PackagePoliciesPanelProps {
  name: string;
  version: string;
}

interface InMemoryPackagePolicyAndAgentPolicy {
  packagePolicy: InMemoryPackagePolicy;
  agentPolicy: GetAgentPoliciesResponseItem;
}

const IntegrationDetailsLink = memo<{
  packagePolicy: InMemoryPackagePolicyAndAgentPolicy['packagePolicy'];
}>(({ packagePolicy }) => {
  const { getHref } = useLink();
  return (
    <EuiLink
      className="eui-textTruncate"
      data-test-subj="integrationNameLink"
      title={packagePolicy.name}
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
  const {
    data,
    isLoading,
    resendRequest: refreshPolicies,
  } = usePackagePoliciesWithAgentPolicy({
    page: pagination.currentPage,
    perPage: pagination.pageSize,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: ${name}`,
  });
  const { updatableIntegrations } = usePackageInstallations();
  const agentEnrollmentFlyoutExtension = useUIExtension(name, 'agent-enrollment-flyout');

  const canWriteIntegrationPolicies = useAuthz().integrations.writeIntegrationPolicies;

  const packageAndAgentPolicies = useMemo((): Array<{
    agentPolicy: GetAgentPoliciesResponseItem;
    packagePolicy: InMemoryPackagePolicy;
  }> => {
    if (!data?.items) {
      return [];
    }

    const newPolicies = data.items.map(({ agentPolicy, packagePolicy }) => {
      const updatableIntegrationRecord = updatableIntegrations.get(
        packagePolicy.package?.name ?? ''
      );
      const hasUpgrade =
        !!updatableIntegrationRecord &&
        updatableIntegrationRecord.policiesToUpgrade.some(
          ({ pkgPolicyId }) => pkgPolicyId === packagePolicy.id
        );

      return {
        agentPolicy,
        packagePolicy: {
          ...packagePolicy,
          hasUpgrade,
        },
      };
    });

    return newPolicies;
  }, [data?.items, updatableIntegrations]);

  const showAddAgentHelpForPackagePolicyId = packageAndAgentPolicies.find(
    ({ agentPolicy }) => agentPolicy.id === showAddAgentHelpForPolicyId
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

  const viewDataStep = useMemo<EuiStepProps>(() => {
    if (agentEnrollmentFlyoutExtension) {
      return {
        title: agentEnrollmentFlyoutExtension.title,
        children: <agentEnrollmentFlyoutExtension.Component />,
      };
    }

    return {
      title: i18n.translate('xpack.fleet.agentEnrollment.stepViewDataTitle', {
        defaultMessage: 'View your data',
      }),
      children: (
        <>
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.viewDataDescription"
              defaultMessage="After your agent starts, you can view your data in Kibana by using the integration's installed assets. {pleaseNote}: it may take a few minutes for the initial data to arrive."
              values={{
                pleaseNote: (
                  <strong>
                    {i18n.translate(
                      'xpack.fleet.epm.agentEnrollment.viewDataDescription.pleaseNoteLabel',
                      { defaultMessage: 'Please note' }
                    )}
                  </strong>
                ),
              }}
            />
          </EuiText>
          <EuiSpacer size="l" />
          <EuiButton
            fill
            href={getHref('integration_details_assets', { pkgkey: `${name}-${version}` })}
          >
            {i18n.translate('xpack.fleet.epm.agentEnrollment.viewDataAssetsLabel', {
              defaultMessage: 'View assets',
            })}
          </EuiButton>
        </>
      ),
    };
  }, [name, version, getHref, agentEnrollmentFlyoutExtension]);

  const columns: Array<EuiTableFieldDataColumnType<InMemoryPackagePolicyAndAgentPolicy>> = useMemo(
    () => [
      {
        field: 'packagePolicy.name',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.name', {
          defaultMessage: 'Integration policy',
        }),
        render(_, { packagePolicy }) {
          return <IntegrationDetailsLink packagePolicy={packagePolicy} />;
        },
      },
      {
        field: 'packagePolicy.package.version',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.version', {
          defaultMessage: 'Version',
        }),
        render(_version, { agentPolicy, packagePolicy }) {
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

              {packagePolicy.hasUpgrade && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    minWidth="0"
                    href={`${getHref('upgrade_package_policy', {
                      policyId: agentPolicy.id,
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
        field: 'packagePolicy.policy_id',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.agentPolicy', {
          defaultMessage: 'Agent policy',
        }),
        truncateText: true,
        render(id, { agentPolicy }) {
          return <AgentPolicySummaryLine policy={agentPolicy} />;
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
        render({ agentPolicy, packagePolicy }: InMemoryPackagePolicyAndAgentPolicy) {
          return (
            <PackagePolicyAgentsCell
              agentPolicy={agentPolicy}
              agentCount={agentPolicy.agents}
              onAddAgent={() => setFlyoutOpenForPolicyId(agentPolicy.id)}
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
        render({ agentPolicy, packagePolicy }) {
          return (
            <PackagePolicyActionsMenu
              agentPolicy={agentPolicy}
              packagePolicy={packagePolicy}
              viewDataStep={viewDataStep}
              showAddAgent={true}
              upgradePackagePolicyHref={`${getHref('upgrade_package_policy', {
                policyId: agentPolicy.id,
                packagePolicyId: packagePolicy.id,
              })}?from=integrations-policy-list`}
            />
          );
        },
      },
    ],
    [getHref, showAddAgentHelpForPackagePolicyId, viewDataStep, canWriteIntegrationPolicies]
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
  if (packageInstallStatus.status !== InstallStatus.installed) {
    return (
      <Redirect to={getPath('integration_details_overview', { pkgkey: `${name}-${version}` })} />
    );
  }
  const agentPolicy = packageAndAgentPolicies.find(
    ({ agentPolicy: policy }) => policy.id === flyoutOpenForPolicyId
  )?.agentPolicy;

  return (
    <AgentPolicyRefreshContext.Provider value={{ refresh: refreshPolicies }}>
      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem grow={1} />
        <EuiFlexItem grow={6}>
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
      {flyoutOpenForPolicyId && agentPolicy && !isLoading && (
        <AgentEnrollmentFlyout
          onClose={() => {
            setFlyoutOpenForPolicyId(null);
            const { addAgentToPolicyId, ...rest } = parse(search);
            history.replace({ search: stringify(rest) });
          }}
          agentPolicy={agentPolicy}
          isIntegrationFlow={true}
          viewDataStep={viewDataStep}
        />
      )}
    </AgentPolicyRefreshContext.Provider>
  );
};
