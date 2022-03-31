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
import { useLocation } from 'react-router-dom';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { EndpointPolicyLink } from '../../../components/endpoint_policy_link';
import { PolicyData, PolicyDetailsRouteState } from '../../../../../common/endpoint/types';
import { useUrlPagination } from '../../../components/hooks/use_url_pagination';
import {
  useGetAgentCountForPolicy,
  useGetEndpointSecurityPackage,
  useGetEndpointSpecificPolicies,
} from '../../../services/policies/hooks';
import { AgentPolicy } from '../../../../../../fleet/common';
import { PolicyEmptyState } from '../../../components/management_empty_state';
import { useNavigateToAppEventHandler } from '../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { CreatePackagePolicyRouteState } from '../../../../../../fleet/public';
import { APP_UI_ID } from '../../../../../common/constants';
import { getPoliciesPath } from '../../../common/routing';
import { useAppUrl, useToasts } from '../../../../common/lib/kibana';
import { PolicyEndpointCount } from './components/policy_endpoint_count';
import { ManagementEmptyStateWrapper } from '../../../components/management_empty_state_wrapper';

export const PolicyList = memo(() => {
  const { pagination, pageSizeOptions, setPagination } = useUrlPagination();
  const { search } = useLocation();
  const { getAppUrl } = useAppUrl();
  const toasts = useToasts();

  // load the list of policies
  const {
    data,
    isFetching: policyIsFetching,
    error,
  } = useGetEndpointSpecificPolicies({
    page: pagination.page,
    perPage: pagination.pageSize,
  });

  // endpoint count per policy
  const policyIds = useMemo(() => data?.items.map((policies) => policies.id) ?? [], [data]);
  const { data: endpointCount = { items: [] } } = useGetAgentCountForPolicy({
    policyIds,
    customQueryOptions: {
      enabled: policyIds.length > 0,
      onError: (err) => {
        toasts.addDanger(
          i18n.translate('xpack.securitySolution.policyList.endpointCountError', {
            defaultMessage: 'Error retrieving endpoint counts',
          })
        );
      },
    },
  });

  // grab endpoint version for empty page
  const { data: endpointPackageInfo, isFetching: packageIsFetching } =
    useGetEndpointSecurityPackage({
      customQueryOptions: {
        enabled: policyIds.length === 0,
        onError: (err) => {
          toasts.addDanger(
            i18n.translate('xpack.securitySolution.policyList.packageVersionError', {
              defaultMessage: 'Error retrieving the endpoint package version',
            })
          );
        },
      },
    });

  const policyIdToEndpointCount = useMemo(() => {
    const map = new Map<AgentPolicy['package_policies'][number], number>();
    for (const policy of endpointCount?.items) {
      map.set(policy.package_policies[0], policy.agents ?? 0);
    }

    // error with the endpointCount api call, set default count to 0
    if (policyIds.length > 0 && map.size === 0) {
      for (const policy of policyIds) {
        map.set(policy, 0);
      }
    }
    return map;
  }, [endpointCount, policyIds]);

  const totalItemCount = useMemo(() => data?.total ?? 0, [data]);

  const policyListPath = useMemo(() => getPoliciesPath(search), [search]);

  const backLink: PolicyDetailsRouteState['backLink'] = useMemo(() => {
    return {
      navigateTo: [
        APP_UI_ID,
        {
          path: policyListPath,
        },
      ],
      label: i18n.translate('xpack.securitySolution.policy.backToPolicyList', {
        defaultMessage: 'Back to policy list',
      }),
      href: getAppUrl({ path: policyListPath }),
    };
  }, [getAppUrl, policyListPath]);

  const handleCreatePolicyClick = useNavigateToAppEventHandler<CreatePackagePolicyRouteState>(
    'fleet',
    {
      path: `/integrations/${
        endpointPackageInfo ? `/endpoint-${endpointPackageInfo?.version}` : ''
      }/add-integration`,
      state: {
        onCancelNavigateTo: [
          APP_UI_ID,
          {
            path: policyListPath,
          },
        ],
        onCancelUrl: getAppUrl({ path: getPoliciesPath() }),
        onSaveNavigateTo: [
          APP_UI_ID,
          {
            path: policyListPath,
          },
        ],
      },
    }
  );
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
                backLink={backLink}
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
        width: '8%',
        render: (policy: PolicyData) => {
          const count = policyIdToEndpointCount.get(policy.id);
          return (
            <PolicyEndpointCount
              className="eui-textTruncate"
              data-test-subj="policyEndpointCountLink"
              policyId={policy.id}
              nonLinkCondition={count === 0}
            >
              {count}
            </PolicyEndpointCount>
          );
        },
      },
    ];
  }, [policyIdToEndpointCount, backLink]);

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
      hideHeader={totalItemCount === 0}
      title={i18n.translate('xpack.securitySolution.policy.list.title', {
        defaultMessage: 'Policy List',
      })}
      subtitle={i18n.translate('xpack.securitySolution.policy.list.subtitle', {
        defaultMessage:
          'Use endpoint policies to customize endpoint security protections and other configurations',
      })}
    >
      {totalItemCount > 0 ? (
        <>
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
            loading={policyIsFetching}
            error={error !== null ? policyListErrorMessage : ''}
          />
        </>
      ) : (
        <ManagementEmptyStateWrapper>
          <PolicyEmptyState
            loading={packageIsFetching}
            onActionClick={handleCreatePolicyClick}
            policyEntryPoint
          />
        </ManagementEmptyStateWrapper>
      )}
    </AdministrationListPage>
  );
});

PolicyList.displayName = 'PolicyList';
