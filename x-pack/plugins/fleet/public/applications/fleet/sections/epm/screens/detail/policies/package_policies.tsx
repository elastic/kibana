/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiLink,
  EuiTableFieldDataColumnType,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative, FormattedMessage } from '@kbn/i18n/react';
import { InstallStatus } from '../../../../../types';
import { useLink, useUrlPagination } from '../../../../../hooks';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../../constants';
import { LinkAndRevision, LinkAndRevisionProps } from '../../../../../components';
import { LinkedAgentCount } from '../../../../../components/linked_agent_count';
import { useGetPackageInstallStatus } from '../../../hooks';
import {
  PackagePolicyAndAgentPolicy,
  usePackagePoliciesWithAgentPolicy,
} from './use_package_policies_with_agent_policy';
import { Persona } from './persona';

const IntegrationDetailsLink = memo<{
  packagePolicy: PackagePolicyAndAgentPolicy['packagePolicy'];
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

const AgentPolicyDetailLink = memo<{
  agentPolicyId: string;
  revision: LinkAndRevisionProps['revision'];
  children: ReactNode;
}>(({ agentPolicyId, revision, children }) => {
  const { getHref } = useLink();

  return (
    <LinkAndRevision
      className="eui-textTruncate"
      revision={revision}
      href={getHref('policy_details', {
        policyId: agentPolicyId,
      })}
    >
      {children}
    </LinkAndRevision>
  );
});

interface PackagePoliciesPanelProps {
  name: string;
  version: string;
}
export const PackagePoliciesPage = ({ name, version }: PackagePoliciesPanelProps) => {
  const { getPath } = useLink();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const packageInstallStatus = getPackageInstallStatus(name);
  const { pagination, pageSizeOptions, setPagination } = useUrlPagination();
  const { data, isLoading } = usePackagePoliciesWithAgentPolicy({
    page: pagination.currentPage,
    perPage: pagination.pageSize,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: ${name}`,
  });

  const handleTableOnChange = useCallback(
    ({ page }: CriteriaWithPagination<PackagePolicyAndAgentPolicy>) => {
      setPagination({
        currentPage: page.index + 1,
        pageSize: page.size,
      });
    },
    [setPagination]
  );

  const columns: Array<EuiTableFieldDataColumnType<PackagePolicyAndAgentPolicy>> = useMemo(
    () => [
      {
        field: 'packagePolicy.name',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.name', {
          defaultMessage: 'Integration',
        }),
        render(_, { packagePolicy }) {
          return <IntegrationDetailsLink packagePolicy={packagePolicy} />;
        },
      },
      {
        field: 'packagePolicy.description',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.description', {
          defaultMessage: 'Description',
        }),
        truncateText: true,
        render(description) {
          return (
            <span className="eui-textTruncate" title={description}>
              {description}
            </span>
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
          return (
            <AgentPolicyDetailLink agentPolicyId={id} revision={agentPolicy.revision}>
              {agentPolicy.name ?? id}
            </AgentPolicyDetailLink>
          );
        },
      },
      {
        field: '',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.agentCount', {
          defaultMessage: 'Agents',
        }),
        truncateText: true,
        align: 'right',
        width: '8ch',
        render({ packagePolicy, agentPolicy }: PackagePolicyAndAgentPolicy) {
          return (
            <LinkedAgentCount
              count={agentPolicy?.agents ?? 0}
              agentPolicyId={packagePolicy.policy_id}
              className="eui-textTruncate"
              data-test-subj="rowAgentCount"
            />
          );
        },
      },
      {
        field: 'packagePolicy.updated_by',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.updatedBy', {
          defaultMessage: 'Last Updated By',
        }),
        truncateText: true,
        render(updatedBy) {
          return <Persona size="s" name={updatedBy} title={updatedBy} />;
        },
      },
      {
        field: 'packagePolicy.updated_at',
        name: i18n.translate('xpack.fleet.epm.packageDetails.integrationList.updatedAt', {
          defaultMessage: 'Last Updated',
        }),
        truncateText: true,
        render(updatedAt: PackagePolicyAndAgentPolicy['packagePolicy']['updated_at']) {
          return (
            <span className="eui-textTruncate" title={updatedAt}>
              <FormattedRelative value={updatedAt} />
            </span>
          );
        },
      },
    ],
    []
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

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1} />
      <EuiFlexItem grow={6}>
        <EuiBasicTable
          items={data?.items || []}
          columns={columns}
          loading={isLoading}
          data-test-subj="integrationPolicyTable"
          pagination={tablePagination}
          onChange={handleTableOnChange}
          noItemsMessage={noItemsMessage}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
