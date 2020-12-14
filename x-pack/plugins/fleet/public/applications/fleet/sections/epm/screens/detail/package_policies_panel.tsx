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
import { InstallStatus } from '../../../../types';
import { useLink } from '../../../../hooks';
import {
  AGENT_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../../../../common/constants';
import { useUrlPagination } from '../../../../hooks';
import {
  PackagePolicyAndAgentPolicy,
  usePackagePoliciesWithAgentPolicy,
} from './use_package_policies_with_agent_policy';
import { LinkAndRevision, LinkAndRevisionProps } from '../../../../components';
import { Persona } from './persona';

const IntegrationDetailsLink = memo<{
  packagePolicy: PackagePolicyAndAgentPolicy['packagePolicy'];
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
  const { data } = usePackagePoliciesWithAgentPolicy({
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
            <PolicyAgentListLink agentPolicyId={packagePolicy.policy_id}>
              {agentPolicy?.agents ?? 0}
            </PolicyAgentListLink>
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
