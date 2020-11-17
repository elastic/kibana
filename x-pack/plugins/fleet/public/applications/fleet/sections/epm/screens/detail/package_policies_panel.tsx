/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, ReactNode, useCallback, useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiLink,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n/react';
import { useGetPackageInstallStatus } from '../../hooks';
import { InstallStatus, PackagePolicy } from '../../../../types';
import { useLink } from '../../../../hooks';
import {
  AGENT_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../../../../common/constants';
import { useUrlPagination } from '../../../../hooks';
import {
  PackagePolicyEnriched,
  useGetEnrichedPackagePolicies,
} from './use_get_enriched_package_policies';

const IntegrationDetailsLink = memo<{
  integrationPolicy: PackagePolicy;
}>(({ integrationPolicy }) => {
  const { getHref } = useLink();
  return (
    <EuiLink
      className="eui-textTruncate"
      href={getHref('edit_integration', {
        policyId: integrationPolicy.policy_id,
        packagePolicyId: integrationPolicy.id,
      })}
    >
      {integrationPolicy.name}
    </EuiLink>
  );
});

const AgentPolicyDetailLink = memo<{ agentPolicyId: string; children: ReactNode }>(
  ({ agentPolicyId, children }) => {
    const { getHref } = useLink();
    return (
      <EuiLink
        className="eui-textTruncate"
        href={getHref('policy_details', {
          policyId: agentPolicyId,
        })}
      >
        {children}
      </EuiLink>
    );
  }
);

const PolicyAgentListLink = memo<{ agentPolicyId: string; children: ReactNode }>(
  ({ agentPolicyId, children }) => {
    const { getHref } = useLink();
    return (
      <EuiLink
        className="eui-textTruncate"
        href={getHref('fleet_agent_list', {
          kuery: `${AGENT_SAVED_OBJECT_TYPE}.policy_id:%20${agentPolicyId}`,
        })}
      >
        {children}
      </EuiLink>
    );
  }
);

interface PackagePoliciesPanelProps {
  name: string;
  version: string;
}
export const PackagePoliciesPanel = ({ name, version }: PackagePoliciesPanelProps) => {
  const { getPath } = useLink();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const packageInstallStatus = getPackageInstallStatus(name);
  const { pagination, pageSizeOptions, setPagination } = useUrlPagination();
  const { data } = useGetEnrichedPackagePolicies({
    page: pagination.currentPage,
    perPage: pagination.pageSize,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: ${name}`,
  });

  const handleTableOnChange = useCallback(
    ({ page }: CriteriaWithPagination<PackagePolicy>) => {
      setPagination({
        currentPage: page.index + 1,
        pageSize: page.size,
      });
    },
    [setPagination]
  );

  const columns: Array<EuiTableFieldDataColumnType<PackagePolicyEnriched>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.ingestManager.epm.packageDetails.integrationList.name', {
          defaultMessage: 'Integration',
        }),
        render(_, integrationPolicy) {
          return <IntegrationDetailsLink integrationPolicy={integrationPolicy} />;
        },
      },
      {
        field: 'description',
        name: i18n.translate('xpack.ingestManager.epm.packageDetails.integrationList.description', {
          defaultMessage: 'Description',
        }),
        truncateText: true,
      },
      {
        field: 'policy_id',
        name: i18n.translate('xpack.ingestManager.epm.packageDetails.integrationList.agentPolicy', {
          defaultMessage: 'Agent policy',
        }),
        truncateText: true,
        render(id, packagePolicy) {
          return (
            <AgentPolicyDetailLink agentPolicyId={id}>
              {packagePolicy._agentPolicy?.name ?? id}
            </AgentPolicyDetailLink>
          );
        },
      },
      {
        field: '',
        name: i18n.translate('xpack.ingestManager.epm.packageDetails.integrationList.agentCount', {
          defaultMessage: 'Agents',
        }),
        truncateText: true,
        align: 'right',
        width: '8ch',
        render(packagePolicy: PackagePolicyEnriched) {
          return (
            <PolicyAgentListLink agentPolicyId={packagePolicy.policy_id}>
              {/* Fixme:PT follow up as to why `agents` is not part of the type */}
              {/* @ts-ignore */}
              {packagePolicy._agentPolicy?.agents ?? 0}
            </PolicyAgentListLink>
          );
        },
      },
      {
        field: 'updated_by',
        name: i18n.translate('xpack.ingestManager.epm.packageDetails.integrationList.updatedBy', {
          defaultMessage: 'Last Updated By',
        }),
        truncateText: true,
      },
      {
        field: 'updated_at',
        name: i18n.translate('xpack.ingestManager.epm.packageDetails.integrationList.updatedAt', {
          defaultMessage: 'Last Updated',
        }),
        truncateText: true,
        render(updatedAt: PackagePolicy['updated_at']) {
          return (
            <span className="eui-textTruncate">
              <FormattedRelative value={updatedAt} />
            </span>
          );
        },
      },
    ],
    []
  );

  // if they arrive at this page and the package is not installed, send them to overview
  // this happens if they arrive with a direct url or they uninstall while on this tab
  if (packageInstallStatus.status !== InstallStatus.installed) {
    return <Redirect to={getPath('integration_details', { pkgkey: `${name}-${version}` })} />;
  }

  return (
    <EuiBasicTable
      items={data?.items || []}
      columns={columns}
      loading={false}
      data-test-subj="integrationPolicyTable"
      pagination={{
        pageIndex: pagination.currentPage - 1,
        pageSize: pagination.pageSize,
        totalItemCount: data?.total ?? 0,
        pageSizeOptions,
      }}
      onChange={handleTableOnChange}
    />
  );
};
