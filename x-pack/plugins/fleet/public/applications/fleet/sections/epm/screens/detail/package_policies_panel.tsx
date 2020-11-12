/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, ReactNode, useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import { EuiBasicTable, EuiLink, EuiTableFieldDataColumnType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useGetPackageInstallStatus } from '../../hooks';
import { InstallStatus, PackagePolicy } from '../../../../types';
import { useGetPackagePolicies, useLink } from '../../../../hooks';
import {
  AGENT_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../../../../common/constants';

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
  const { data } = useGetPackagePolicies({
    page: 1,
    perPage: 1000,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: ${name}`,
  });

  const columns: Array<EuiTableFieldDataColumnType<PackagePolicy>> = useMemo(
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
          defaultMessage: 'Agent Policy',
        }),
        truncateText: true,
        render(id) {
          return <AgentPolicyDetailLink agentPolicyId={id}>{id}</AgentPolicyDetailLink>;
        },
      },
      {
        field: '',
        name: i18n.translate('xpack.ingestManager.epm.packageDetails.integrationList.agentCount', {
          defaultMessage: 'Agents',
        }),
        truncateText: true,
        align: 'center',
        render(packagePolicy) {
          return (
            <PolicyAgentListLink agentPolicyId={packagePolicy.policy_id}>
              <span>{Math.random().toString().substr(-2)}</span>
            </PolicyAgentListLink>
          );
        },
      },
      {
        field: 'created_by',
        name: i18n.translate('xpack.ingestManager.epm.packageDetails.integrationList.createdBy', {
          defaultMessage: 'Created By',
        }),
        truncateText: true,
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
      },
    ],
    []
  );

  // if they arrive at this page and the package is not installed, send them to overview
  // this happens if they arrive with a direct url or they uninstall while on this tab
  if (packageInstallStatus.status !== InstallStatus.installed)
    return <Redirect to={getPath('integration_details', { pkgkey: `${name}-${version}` })} />;

  return (
    <EuiBasicTable
      items={data?.items || []}
      columns={columns}
      loading={false}
      data-test-subj="integrationPolicyTable"
    />
  );
};
