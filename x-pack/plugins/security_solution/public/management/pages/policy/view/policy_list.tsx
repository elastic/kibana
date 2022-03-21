/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiText,
  EuiHorizontalRule,
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  CriteriaWithPagination,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { EndpointPolicyLink } from '../../../components/endpoint_policy_link';
import { PolicyData } from '../../../../../common/endpoint/types';
import { useUrlPagination } from '../../../components/hooks/use_url_pagination';
import {
  useGetAgentCountForPolicy,
  useGetEndpointSpecificPolicies,
} from '../../../services/policies/hooks';
import { AgentPolicy } from '../../../../../../fleet/common';
import { PolicyEndpointListLink } from '../../../components/policy_endpoint_list_link';

export const PolicyList = memo(() => {
  const { pagination, pageSizeOptions, setPagination } = useUrlPagination();

  // load the list of policies
  const { data, isFetching, error } = useGetEndpointSpecificPolicies({
    page: pagination.page,
    perPage: pagination.pageSize,
  });

  // endpoint count per policy
  const policyIds = data?.items.map((policies) => policies.id) ?? [];
  const { data: endpointCount = { items: [] } } = useGetAgentCountForPolicy({
    policyIds,
    customQueryOptions: { enabled: policyIds.length > 0 },
  });

  const policyIdToEndpointCount = useMemo(() => {
    const map = new Map<AgentPolicy['package_policies'][number], number>();
    for (const policy of endpointCount?.items) {
      map.set(policy.package_policies[0], policy.agents ?? 0);
    }
    return map;
  }, [endpointCount]);

  const totalItemCount = data?.total ?? 0;

  const policyColumns = useMemo(() => {
    const updatedAtColumnName = i18n.translate('xpack.securitySolution.policy.list.updatedAt', {
      defaultMessage: 'Last Updated',
    });

    const createdAtColumnName = i18n.translate('xpack.securitySolution.policy.list.createdAt', {
      defaultMessage: 'Date Created',
    });

    return [
      {
        field: '',
        name: i18n.translate('xpack.securitySolution.policy.list.name', { defaultMessage: 'Name' }),
        truncateText: true,
        render: (policy: PolicyData) => {
          return (
            <EuiToolTip content={policy.name} anchorClassName="eui-textTruncate">
              <EndpointPolicyLink
                policyId={policy.id}
                className="eui-textTruncate"
                data-test-subj="policyNameCellLink"
              >
                {policy.name}
              </EndpointPolicyLink>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'created_by',
        name: i18n.translate('xpack.securitySolution.policy.list.createdBy', {
          defaultMessage: 'Created by',
        }),
        truncateText: true,
        render: (name: string) => {
          return (
            <EuiFlexGroup responsive={false} gutterSize={'xs'} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiAvatar name={name} data-test-subj={'created-by-avatar'} size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{name}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'created_at',
        name: createdAtColumnName,
        truncateText: true,
        render: (date: string) => {
          return (
            <FormattedDate
              fieldName={createdAtColumnName}
              value={date}
              className="eui-textTruncate"
            />
          );
        },
      },
      {
        field: 'updated_by',
        name: i18n.translate('xpack.securitySolution.policy.list.lastUpdatedBy', {
          defaultMessage: 'Last updated by',
        }),
        truncateText: true,
        render: (name: string) => {
          return (
            <EuiFlexGroup responsive={false} gutterSize={'xs'} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiAvatar name={name} data-test-subj={'updated-by-avatar'} size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{name}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'updated_at',
        name: updatedAtColumnName,
        truncateText: true,
        render: (date: string) => {
          return (
            <FormattedDate
              fieldName={updatedAtColumnName}
              value={date}
              className="eui-textTruncate"
            />
          );
        },
      },
      {
        field: '',
        name: i18n.translate('xpack.securitySolution.policy.list.endpoints', {
          defaultMessage: 'Endpoints',
        }),
        dataType: 'number',
        width: '8%',
        render: (policy: PolicyData) => {
          return (
            <PolicyEndpointListLink
              className="eui-textTruncate"
              data-test-subj="policyEndpointCountLink"
              policyId={policy.id}
            >
              {policyIdToEndpointCount.get(policy.id)}
            </PolicyEndpointListLink>
          );
        },
      },
      {
        field: '-',
        name: i18n.translate('xpack.securitySolution.policy.list.actions', {
          defaultMessage: 'Actions',
        }),
      },
    ];
  }, [policyIdToEndpointCount]);

  const handleTableOnChange = useCallback(
    ({ page }: CriteriaWithPagination<PolicyData>) => {
      setPagination({
        page: page.index + 1,
        pageSize: page.size,
      });
    },
    [setPagination]
  );

  const tablePagination = useMemo(() => {
    return {
      pageIndex: pagination.page - 1,
      pageSize: pagination.pageSize,
      totalItemCount,
      pageSizeOptions,
    };
  }, [totalItemCount, pageSizeOptions, pagination.page, pagination.pageSize]);

  const policyListErrorMessage = i18n.translate('xpack.securitySolution.policy.list.errorMessage', {
    defaultMessage: 'Error while retrieving list of policies',
  });

  return (
    <AdministrationListPage
      data-test-subj="policyListPage"
      title={i18n.translate('xpack.securitySolution.policy.list.title', {
        defaultMessage: 'Policy List',
      })}
      subtitle={i18n.translate('xpack.securitySolution.policy.list.subtitle', {
        defaultMessage:
          'Use endpoint policies to customize endpoint security protections and other configurations',
      })}
    >
      <EuiText color="subdued" size="xs" data-test-subj="endpointListTableTotal">
        <FormattedMessage
          id="xpack.securitySolution.policy.list.totalCount"
          defaultMessage="Showing {totalItemCount, plural, one {# policy} other {# policies}}"
          values={{ totalItemCount }}
        />
      </EuiText>
      <EuiHorizontalRule margin="xs" />
      <EuiBasicTable
        data-test-subj="policyListTable"
        items={data?.items || []}
        columns={policyColumns}
        pagination={tablePagination}
        onChange={handleTableOnChange}
        loading={isFetching}
        error={error !== null ? policyListErrorMessage : ''}
      />
    </AdministrationListPage>
  );
});

PolicyList.displayName = 'PolicyList';
