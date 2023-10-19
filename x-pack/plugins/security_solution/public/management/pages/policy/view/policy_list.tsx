/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';

import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiText,
  EuiHorizontalRule,
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiIconTip,
  EuiCallOut,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useLocation } from 'react-router-dom';
import type { CreatePackagePolicyRouteState } from '@kbn/fleet-plugin/public';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import moment from 'moment';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { EndpointPolicyLink } from '../../../components/endpoint_policy_link';
import type { PolicyData, PolicyDetailsRouteState } from '../../../../../common/endpoint/types';
import { useUrlPagination } from '../../../hooks/use_url_pagination';
import {
  useEndpointPackagePoliciesStats,
  useGetEndpointSecurityPackage,
  useGetEndpointSpecificPolicies,
} from '../../../services/policies/hooks';
import { PolicyEmptyState } from '../../../components/management_empty_state';
import { useNavigateToAppEventHandler } from '../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { APP_UI_ID } from '../../../../../common/constants';
import { getPoliciesPath } from '../../../common/routing';
import { useAppUrl, useToasts } from '../../../../common/lib/kibana';
import { PolicyEndpointCount } from './components/policy_endpoint_count';
import { ManagementEmptyStateWrapper } from '../../../components/management_empty_state_wrapper';

export const policyListErrorMessage = i18n.translate(
  'xpack.securitySolution.policy.list.errorMessage',
  {
    defaultMessage: 'Error while retrieving list of policies',
  }
);

const policyListErrorToastTitle = i18n.translate(
  'xpack.securitySolution.policy.list.errorMessage.toast.title',
  {
    defaultMessage: 'Failed to retrieve policy list',
  }
);

const policyListErrorToastText = i18n.translate(
  'xpack.securitySolution.policyList.packageVersionError',
  {
    defaultMessage: 'Error retrieving the endpoint package version',
  }
);

export const PolicyList = memo(() => {
  const { canReadEndpointList, loading: authLoading } = useUserPrivileges().endpointPrivileges;
  const isProtectionUpdatesEnabled = useIsExperimentalFeatureEnabled('protectionUpdatesEnabled');
  const { pagination, pageSizeOptions, setPagination } = useUrlPagination();
  const { search } = useLocation();
  const { getAppUrl } = useAppUrl();
  const toasts = useToasts();
  const { euiTheme } = useEuiTheme();

  // load the list of policies
  const {
    data,
    isFetching: policyIsFetching,
    error,
  } = useGetEndpointSpecificPolicies({
    page: pagination.page,
    perPage: pagination.pageSize,
    onError: (err) => {
      toasts.addDanger({ title: policyListErrorToastTitle, text: err.message });
    },
  });

  const { data: outdatedManifestsCountResponse, isLoading: isOutdatedManifestsCountLoading } =
    useEndpointPackagePoliciesStats(isProtectionUpdatesEnabled);

  // grab endpoint version for empty page
  const { data: endpointPackageInfo, isFetching: packageIsFetching } =
    useGetEndpointSecurityPackage({
      customQueryOptions: {
        onError: (err) => {
          toasts.addDanger({
            title: policyListErrorToastText,
            text: err.message,
          });
        },
      },
    });

  const totalItemCount = useMemo(() => data?.total ?? 0, [data]);

  const shouldShowOnboarding = useMemo(
    () => !policyIsFetching && totalItemCount === 0 && !error,
    [policyIsFetching, totalItemCount, error]
  );

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
      path: pagePathGetters.add_integration_to_policy({
        pkgkey: endpointPackageInfo ? `/endpoint-${endpointPackageInfo?.version}` : '',
      })[1],
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

  const outdatedManifestsCallOut = useMemo(() => {
    if (
      !isProtectionUpdatesEnabled ||
      isOutdatedManifestsCountLoading ||
      !outdatedManifestsCountResponse ||
      outdatedManifestsCountResponse.outdatedManifestsCount === 0
    ) {
      return null;
    }

    return (
      <EuiCallOut
        color={'warning'}
        size="m"
        data-test-subj="policy-list-outdated-manifests-call-out"
        title={i18n.translate('xpack.securitySolution.policy.list.outdatedManifestsCallOut', {
          defaultMessage:
            'Updates available for {outdatedManifestsCount} {outdatedManifestsCount, plural, one {policy} other {policies}}',
          values: { outdatedManifestsCount: outdatedManifestsCountResponse.outdatedManifestsCount },
        })}
      />
    );
  }, [isOutdatedManifestsCountLoading, isProtectionUpdatesEnabled, outdatedManifestsCountResponse]);

  const policyColumns = useMemo(() => {
    const updatedAtColumnName = i18n.translate('xpack.securitySolution.policy.list.updatedAt', {
      defaultMessage: 'Last Updated',
    });

    const createdAtColumnName = i18n.translate('xpack.securitySolution.policy.list.createdAt', {
      defaultMessage: 'Date Created',
    });

    const generateDeployedVersionEntry = (version?: 'latest' | string) => {
      if (!version) {
        return [];
      }

      if (version === 'latest') {
        return [
          'success',
          i18n.translate('xpack.securitySolution.policy.list.manifestLatest', {
            defaultMessage: 'latest',
          }),
        ];
      }

      const parsedDate = moment.utc(version, 'YYYY-MM-DD');

      if (parsedDate < moment.utc().subtract(18, 'months')) {
        return [
          'danger',
          parsedDate.format('MMMM DD, YYYY'),
          i18n.translate('xpack.securitySolution.policy.list.manifestOver18MonthsOld', {
            defaultMessage: 'Manifest is over 18 months old and rollback is not supported',
          }),
        ];
      }

      if (parsedDate > moment.utc().subtract(1, 'month')) {
        return ['success', parsedDate.format('MMMM DD, YYYY')];
      }

      return [
        euiTheme.colors.warning,
        parsedDate.format('MMMM DD, YYYY'),
        i18n.translate('xpack.securitySolution.policy.list.manifestOver1MonthOld', {
          defaultMessage: 'Manifest is over a month old',
        }),
      ];
    };

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
      ...(isProtectionUpdatesEnabled
        ? [
            {
              field: '',
              name: i18n.translate('xpack.securitySolution.policy.list.deployedVersion', {
                defaultMessage: 'Deployed Version',
              }),
              truncateText: true,
              render: (policy: PolicyData) => {
                const [color, displayText, tooltip] = generateDeployedVersionEntry(
                  policy.inputs[0]?.config?.policy.value.global_manifest_version
                );

                return (
                  <EuiFlexGroup responsive={false} gutterSize={'xs'} alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiIconTip type={'dot'} color={color} content={tooltip} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" data-test-subj="policyDeployedVersion">
                        {displayText}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                );
              },
            },
          ]
        : []),
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
                <EuiText size="s" data-test-subj="created-by-name">
                  {name}
                </EuiText>
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
                <EuiText size="s" data-test-subj="updated-by-name">
                  {name}
                </EuiText>
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
          const count = policy.agents ?? 0;

          return (
            <PolicyEndpointCount
              className="eui-textTruncate"
              data-test-subj="policyEndpointCountLink"
              policyId={policy.id}
              nonLinkCondition={authLoading || !canReadEndpointList || count === 0}
            >
              {count}
            </PolicyEndpointCount>
          );
        },
      },
    ];
  }, [
    isProtectionUpdatesEnabled,
    euiTheme.colors.warning,
    backLink,
    authLoading,
    canReadEndpointList,
  ]);

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

  return (
    <AdministrationListPage
      data-test-subj="policyListPage"
      hideHeader={shouldShowOnboarding}
      title={i18n.translate('xpack.securitySolution.policy.list.title', {
        defaultMessage: 'Policies',
      })}
      subtitle={i18n.translate('xpack.securitySolution.policy.list.subtitle', {
        defaultMessage:
          'Use policies to customize endpoint and cloud workload protections and other configurations',
      })}
    >
      {!shouldShowOnboarding ? (
        <>
          <EuiText color="subdued" size="xs" data-test-subj="endpointListTableTotal">
            <FormattedMessage
              id="xpack.securitySolution.policy.list.totalCount"
              defaultMessage="Showing {totalItemCount, plural, one {# policy} other {# policies}}"
              values={{ totalItemCount }}
            />
          </EuiText>
          <EuiHorizontalRule margin="xs" />
          {outdatedManifestsCallOut}
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
