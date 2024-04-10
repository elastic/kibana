/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type CSSProperties, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiLoadingLogo,
  type EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  type EuiSelectableProps,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { createStructuredSelector } from 'reselect';
import { useDispatch } from 'react-redux';
import type {
  AgentPolicyDetailsDeployAgentAction,
  CreatePackagePolicyRouteState,
} from '@kbn/fleet-plugin/public';
import { TransformFailedCallout } from './components/transform_failed_callout';
import type { EndpointIndexUIQueryParams } from '../types';
import { EndpointListNavLink } from './components/endpoint_list_nav_link';
import { EndpointAgentStatus } from '../../../../common/components/endpoint/endpoint_agent_status';
import { EndpointDetailsFlyout } from './details';
import * as selectors from '../store/selectors';
import { getEndpointPendingActionsCallback } from '../store/selectors';
import { useEndpointSelector } from './hooks';
import { isPolicyOutOfDate } from '../utils';
import { POLICY_STATUS_TO_HEALTH_COLOR, POLICY_STATUS_TO_TEXT } from './host_constants';
import type { CreateStructuredSelector } from '../../../../common/store';
import type {
  HostInfo,
  HostInfoInterface,
  Immutable,
  PolicyDetailsRouteState,
} from '../../../../../common/endpoint/types';
import { EndpointSortableField } from '../../../../../common/endpoint/types';
import { DEFAULT_POLL_INTERVAL, MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../common/constants';
import { HostsEmptyState, PolicyEmptyState } from '../../../components/management_empty_state';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { useNavigateToAppEventHandler } from '../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { EndpointPolicyLink } from '../../../components/endpoint_policy_link';
import { SecurityPageName } from '../../../../app/types';
import { getEndpointDetailsPath, getEndpointListPath } from '../../../common/routing';
import { useFormatUrl } from '../../../../common/components/link_to';
import { useAppUrl } from '../../../../common/lib/kibana/hooks';
import type { EndpointAction } from '../store/action';
import { OutOfDate } from './components/out_of_date';
import { AdminSearchBar } from './components/search_bar';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { TableRowActions } from './components/table_row_actions';
import { APP_UI_ID } from '../../../../../common/constants';
import { ManagementEmptyStateWrapper } from '../../../components/management_empty_state_wrapper';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { BackToPolicyListButton } from './components/back_to_policy_list_button';

const MAX_PAGINATED_ITEM = 9999;

const StyledDatePicker = styled.div`
  .euiFormControlLayout--group {
    background-color: rgba(0, 119, 204, 0.2);
  }
`;

interface GetEndpointListColumnsProps {
  canReadPolicyManagement: boolean;
  backToEndpointList: PolicyDetailsRouteState['backLink'];
  getHostPendingActions: ReturnType<typeof getEndpointPendingActionsCallback>;
  queryParams: Immutable<EndpointIndexUIQueryParams>;
  search: string;
  getAppUrl: ReturnType<typeof useAppUrl>['getAppUrl'];
}

const columnWidths: Record<
  Exclude<EndpointSortableField, EndpointSortableField.ENROLLED_AT> | 'actions',
  string
> = {
  [EndpointSortableField.HOSTNAME]: '18%',
  [EndpointSortableField.HOST_STATUS]: '15%',
  [EndpointSortableField.POLICY_NAME]: '20%',
  [EndpointSortableField.POLICY_STATUS]: '150px',
  [EndpointSortableField.HOST_OS_NAME]: '90px',
  [EndpointSortableField.HOST_IP]: '22%',
  [EndpointSortableField.AGENT_VERSION]: '10%',
  [EndpointSortableField.LAST_SEEN]: '15%',
  actions: '65px',
};

const getEndpointListColumns = ({
  canReadPolicyManagement,
  backToEndpointList,
  getHostPendingActions,
  queryParams,
  search,
  getAppUrl,
}: GetEndpointListColumnsProps): Array<EuiBasicTableColumn<Immutable<HostInfo>>> => {
  const lastActiveColumnName = i18n.translate('xpack.securitySolution.endpoint.list.lastActive', {
    defaultMessage: 'Last active',
  });
  const padLeft: CSSProperties = { paddingLeft: '6px' };

  return [
    {
      field: EndpointSortableField.HOSTNAME,
      width: columnWidths[EndpointSortableField.HOSTNAME],
      name: i18n.translate('xpack.securitySolution.endpoint.list.hostname', {
        defaultMessage: 'Endpoint',
      }),
      sortable: true,
      render: (hostname: HostInfo['metadata']['host']['hostname'], item: HostInfo) => {
        const toRoutePath = getEndpointDetailsPath(
          {
            ...queryParams,
            name: 'endpointDetails',
            selected_endpoint: item.metadata.agent.id,
          },
          search
        );
        const toRouteUrl = getAppUrl({ path: toRoutePath });
        return (
          <EuiToolTip content={hostname} anchorClassName="eui-textTruncate">
            <EndpointListNavLink
              name={hostname}
              href={toRouteUrl}
              route={toRoutePath}
              dataTestSubj="hostnameCellLink"
            />
          </EuiToolTip>
        );
      },
    },
    {
      field: EndpointSortableField.HOST_STATUS,
      width: columnWidths[EndpointSortableField.HOST_STATUS],
      name: i18n.translate('xpack.securitySolution.endpoint.list.hostStatus', {
        defaultMessage: 'Agent status',
      }),
      sortable: true,
      render: (hostStatus: HostInfo['host_status'], endpointInfo) => {
        return (
          <EndpointAgentStatus
            endpointHostInfo={endpointInfo}
            pendingActions={getHostPendingActions(endpointInfo.metadata.agent.id)}
            data-test-subj="rowHostStatus"
          />
        );
      },
    },
    {
      field: EndpointSortableField.POLICY_NAME,
      width: columnWidths[EndpointSortableField.POLICY_NAME],
      name: i18n.translate('xpack.securitySolution.endpoint.list.policy', {
        defaultMessage: 'Policy',
      }),
      sortable: true,
      truncateText: true,
      render: (
        policyName: HostInfo['metadata']['Endpoint']['policy']['applied']['name'],
        item: HostInfo
      ) => {
        const policy = item.metadata.Endpoint.policy.applied;

        return (
          <>
            <EuiToolTip content={policyName} anchorClassName="eui-textTruncate">
              {canReadPolicyManagement ? (
                <EndpointPolicyLink
                  policyId={policy.id}
                  className="eui-textTruncate"
                  data-test-subj="policyNameCellLink"
                  backLink={backToEndpointList}
                >
                  {policyName}
                </EndpointPolicyLink>
              ) : (
                <>{policyName}</>
              )}
            </EuiToolTip>
            {policy.endpoint_policy_version && (
              <EuiText
                color="subdued"
                size="xs"
                style={{ whiteSpace: 'nowrap', ...padLeft }}
                className="eui-textTruncate"
                data-test-subj="policyListRevNo"
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.list.policy.revisionNumber"
                  defaultMessage="rev. {revNumber}"
                  values={{ revNumber: policy.endpoint_policy_version }}
                />
              </EuiText>
            )}
            {isPolicyOutOfDate(policy, item.policy_info) && (
              <OutOfDate style={padLeft} data-test-subj="rowPolicyOutOfDate" />
            )}
          </>
        );
      },
    },
    {
      field: EndpointSortableField.POLICY_STATUS,
      width: columnWidths[EndpointSortableField.POLICY_STATUS],
      name: i18n.translate('xpack.securitySolution.endpoint.list.policyStatus', {
        defaultMessage: 'Policy status',
      }),
      sortable: true,
      render: (
        status: HostInfo['metadata']['Endpoint']['policy']['applied']['status'],
        item: HostInfo
      ) => {
        const toRoutePath = getEndpointDetailsPath({
          name: 'endpointPolicyResponse',
          ...queryParams,
          selected_endpoint: item.metadata.agent.id,
        });
        const toRouteUrl = getAppUrl({ path: toRoutePath });
        return (
          <EuiToolTip content={POLICY_STATUS_TO_TEXT[status]} anchorClassName="eui-textTruncate">
            <EuiHealth
              color={POLICY_STATUS_TO_HEALTH_COLOR[status]}
              className="eui-textTruncate eui-fullWidth"
              data-test-subj="rowPolicyStatus"
            >
              <EndpointListNavLink
                name={POLICY_STATUS_TO_TEXT[status]}
                href={toRouteUrl}
                route={toRoutePath}
                dataTestSubj="policyStatusCellLink"
              />
            </EuiHealth>
          </EuiToolTip>
        );
      },
    },
    {
      field: EndpointSortableField.HOST_OS_NAME,
      width: columnWidths[EndpointSortableField.HOST_OS_NAME],
      name: i18n.translate('xpack.securitySolution.endpoint.list.os', {
        defaultMessage: 'OS',
      }),
      sortable: true,
      render: (os: string) => {
        return (
          <EuiToolTip content={os} anchorClassName="eui-textTruncate">
            <EuiText size="s" className="eui-textTruncate eui-fullWidth">
              <p className="eui-displayInline eui-TextTruncate">{os}</p>
            </EuiText>
          </EuiToolTip>
        );
      },
    },
    {
      field: EndpointSortableField.HOST_IP,
      width: columnWidths[EndpointSortableField.HOST_IP],
      name: i18n.translate('xpack.securitySolution.endpoint.list.ip', {
        defaultMessage: 'IP address',
      }),
      sortable: true,
      render: (ip: string[]) => {
        return (
          <EuiToolTip content={ip.toString().replace(',', ', ')} anchorClassName="eui-textTruncate">
            <EuiText size="s" className="eui-textTruncate eui-fullWidth">
              <p className="eui-displayInline eui-textTruncate">
                {ip.toString().replace(',', ', ')}
              </p>
            </EuiText>
          </EuiToolTip>
        );
      },
    },
    {
      field: EndpointSortableField.AGENT_VERSION,
      width: columnWidths[EndpointSortableField.AGENT_VERSION],
      name: i18n.translate('xpack.securitySolution.endpoint.list.endpointVersion', {
        defaultMessage: 'Version',
      }),
      sortable: true,
      render: (version: string) => {
        return (
          <EuiToolTip content={version} anchorClassName="eui-textTruncate">
            <EuiText size="s" className="eui-textTruncate eui-fullWidth">
              <p className="eui-displayInline eui-TextTruncate">{version}</p>
            </EuiText>
          </EuiToolTip>
        );
      },
    },
    {
      field: EndpointSortableField.LAST_SEEN,
      width: columnWidths[EndpointSortableField.LAST_SEEN],
      name: lastActiveColumnName,
      sortable: true,
      render(dateValue: HostInfo['last_checkin']) {
        return (
          <FormattedDate
            fieldName={lastActiveColumnName}
            value={dateValue}
            className="eui-textTruncate"
          />
        );
      },
    },
    {
      field: '',
      width: columnWidths.actions,
      name: i18n.translate('xpack.securitySolution.endpoint.list.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: (item: HostInfo) => {
            return <TableRowActions endpointMetadata={item.metadata} />;
          },
        },
      ],
    },
  ];
};

// FIXME: this needs refactoring - we are pulling in all selectors from endpoint, which includes many more than what the list uses
const selector = (createStructuredSelector as CreateStructuredSelector)(selectors);

const stateHandleDeployEndpointsClick: AgentPolicyDetailsDeployAgentAction = {
  onDoneNavigateTo: [APP_UI_ID, { path: getEndpointListPath({ name: 'endpointList' }) }],
};

export const EndpointList = () => {
  const history = useHistory();
  const {
    listData,
    pageIndex,
    pageSize,
    sortField,
    sortDirection,
    totalHits: totalItemCount,
    listLoading: loading,
    listError,
    uiQueryParams: queryParams,
    hasSelectedEndpoint,
    policyItems,
    selectedPolicyId,
    policyItemsLoading,
    endpointPackageVersion,
    endpointsExist,
    autoRefreshInterval,
    isAutoRefreshEnabled,
    patternsError,
    metadataTransformStats,
    isInitialized,
  } = useEndpointSelector(selector);
  const getHostPendingActions = useEndpointSelector(getEndpointPendingActionsCallback);
  const {
    canReadEndpointList,
    canAccessFleet,
    canReadPolicyManagement,
    loading: endpointPrivilegesLoading,
  } = useUserPrivileges().endpointPrivileges;
  const { search } = useFormatUrl(SecurityPageName.administration);
  const { search: searchParams } = useLocation();
  const { state: routeState = {} } = useLocation<PolicyDetailsRouteState>();
  const { getAppUrl } = useAppUrl();
  const dispatch = useDispatch<(a: EndpointAction) => void>();
  // cap ability to page at 10k records. (max_result_window)
  const maxPageCount = totalItemCount > MAX_PAGINATED_ITEM ? MAX_PAGINATED_ITEM : totalItemCount;

  const hasPolicyData = useMemo(() => policyItems && policyItems.length > 0, [policyItems]);
  const hasListData = useMemo(() => listData && listData.length > 0, [listData]);

  const refreshStyle = useMemo(() => {
    return { display: endpointsExist ? 'flex' : 'none', maxWidth: 200 };
  }, [endpointsExist]);

  const refreshIsPaused = useMemo(() => {
    return !endpointsExist ? false : hasSelectedEndpoint ? true : !isAutoRefreshEnabled;
  }, [endpointsExist, hasSelectedEndpoint, isAutoRefreshEnabled]);

  const refreshInterval = useMemo(() => {
    return !endpointsExist ? DEFAULT_POLL_INTERVAL : autoRefreshInterval;
  }, [endpointsExist, autoRefreshInterval]);

  const shouldShowKQLBar = useMemo(() => {
    return endpointsExist && !patternsError;
  }, [endpointsExist, patternsError]);

  const paginationSetup = useMemo(() => {
    return {
      pageIndex,
      pageSize,
      totalItemCount: maxPageCount,
      pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
      showPerPageOptions: true,
    };
  }, [pageIndex, pageSize, maxPageCount]);

  const onTableChange = useCallback(
    ({ page, sort }: CriteriaWithPagination<HostInfoInterface>) => {
      const { index, size } = page;
      // FIXME: PT: if endpoint details is open, table is not displaying correct number of rows
      history.push(
        getEndpointListPath({
          name: 'endpointList',
          ...queryParams,
          page_index: JSON.stringify(index),
          page_size: JSON.stringify(size),
          sort_direction: sort?.direction,
          sort_field: sort?.field as EndpointSortableField,
        })
      );
    },
    [history, queryParams]
  );

  const stateHandleCreatePolicyClick: CreatePackagePolicyRouteState = useMemo(
    () => ({
      onCancelNavigateTo: [
        APP_UI_ID,
        {
          path: getEndpointListPath({ name: 'endpointList' }),
        },
      ],
      onCancelUrl: getAppUrl({ path: getEndpointListPath({ name: 'endpointList' }) }),
      onSaveNavigateTo: [
        APP_UI_ID,
        {
          path: getEndpointListPath({ name: 'endpointList' }),
        },
      ],
    }),
    [getAppUrl]
  );

  const handleCreatePolicyClick = useNavigateToAppEventHandler<CreatePackagePolicyRouteState>(
    'fleet',
    {
      path: `/integrations/${
        endpointPackageVersion ? `/endpoint-${endpointPackageVersion}` : ''
      }/add-integration`,
      state: stateHandleCreatePolicyClick,
    }
  );

  const backToEndpointList: PolicyDetailsRouteState['backLink'] = useMemo(() => {
    const endpointListPath = getEndpointListPath({ name: 'endpointList' }, searchParams);

    return {
      navigateTo: [
        APP_UI_ID,
        {
          path: endpointListPath,
        },
      ],
      label: i18n.translate('xpack.securitySolution.endpoint.policy.details.backToListTitle', {
        defaultMessage: 'View all endpoints',
      }),
      href: getAppUrl({ path: endpointListPath }),
    };
  }, [getAppUrl, searchParams]);

  const onRefresh = useCallback(() => {
    dispatch({
      type: 'appRequestedEndpointList',
    });
  }, [dispatch]);

  const onRefreshChange = useCallback(
    (evt) => {
      dispatch({
        type: 'userUpdatedEndpointListRefreshOptions',
        payload: {
          isAutoRefreshEnabled: !evt.isPaused,
          autoRefreshInterval: evt.refreshInterval,
        },
      });
    },
    [dispatch]
  );

  // Used for an auto-refresh super date picker version without any date/time selection
  const onTimeChange = useCallback(() => {}, []);

  const handleDeployEndpointsClick =
    useNavigateToAppEventHandler<AgentPolicyDetailsDeployAgentAction>('fleet', {
      path: `/policies/${selectedPolicyId}?openEnrollmentFlyout=true`,
      state: stateHandleDeployEndpointsClick,
    });

  const handleSelectableOnChange = useCallback<(o: EuiSelectableProps['options']) => void>(
    (changedOptions) => {
      return changedOptions.some((option) => {
        if ('checked' in option && option.checked === 'on') {
          dispatch({
            type: 'userSelectedEndpointPolicy',
            payload: {
              selectedPolicyId: option.key as string,
            },
          });
          return true;
        } else {
          return false;
        }
      });
    },
    [dispatch]
  );

  const setTableRowProps = useCallback((endpoint: HostInfo) => {
    return {
      'data-endpoint-id': endpoint.metadata.agent.id,
    };
  }, []);

  const columns = useMemo(
    () =>
      getEndpointListColumns({
        canReadPolicyManagement,
        backToEndpointList,
        getAppUrl,
        getHostPendingActions,
        queryParams,
        search,
      }),
    [
      backToEndpointList,
      canReadPolicyManagement,
      getAppUrl,
      getHostPendingActions,
      queryParams,
      search,
    ]
  );

  const sorting = useMemo(
    () => ({
      sort: { field: sortField as keyof HostInfoInterface, direction: sortDirection },
    }),
    [sortDirection, sortField]
  );

  const mutableListData = useMemo(() => [...listData], [listData]);
  const renderTableOrEmptyState = useMemo(() => {
    if (!isInitialized) {
      return (
        <ManagementEmptyStateWrapper>
          <EuiEmptyPrompt
            icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
            title={
              <h2>
                {i18n.translate('xpack.securitySolution.endpoint.list.loadingEndpointManagement', {
                  defaultMessage: 'Loading Endpoint Management',
                })}
              </h2>
            }
          />
        </ManagementEmptyStateWrapper>
      );
    } else if (listError) {
      return (
        <ManagementEmptyStateWrapper>
          <EuiEmptyPrompt
            color="danger"
            iconType="error"
            title={<h2>{listError.error}</h2>}
            body={<p>{listError.message}</p>}
          />
        </ManagementEmptyStateWrapper>
      );
    } else if (endpointsExist) {
      return (
        <EuiBasicTable
          data-test-subj="endpointListTable"
          items={mutableListData}
          columns={columns}
          pagination={paginationSetup}
          onChange={onTableChange}
          loading={loading}
          rowProps={setTableRowProps}
          sorting={sorting}
        />
      );
    } else if (canReadEndpointList && !canAccessFleet) {
      return (
        <ManagementEmptyStateWrapper>
          <PolicyEmptyState loading={endpointPrivilegesLoading} />
        </ManagementEmptyStateWrapper>
      );
    } else if (!policyItemsLoading && hasPolicyData) {
      const selectionOptions: EuiSelectableProps['options'] = policyItems.map((item) => {
        return {
          key: item.policy_id,
          label: item.name,
          checked: selectedPolicyId === item.policy_id ? 'on' : undefined,
        };
      });
      return (
        <HostsEmptyState
          loading={loading}
          onActionClick={handleDeployEndpointsClick}
          actionDisabled={!selectedPolicyId}
          handleSelectableOnChange={handleSelectableOnChange}
          selectionOptions={selectionOptions}
        />
      );
    } else {
      return (
        <ManagementEmptyStateWrapper>
          <PolicyEmptyState loading={policyItemsLoading} onActionClick={handleCreatePolicyClick} />
        </ManagementEmptyStateWrapper>
      );
    }
  }, [
    isInitialized,
    listError,
    endpointsExist,
    canReadEndpointList,
    canAccessFleet,
    policyItemsLoading,
    hasPolicyData,
    mutableListData,
    columns,
    paginationSetup,
    onTableChange,
    loading,
    setTableRowProps,
    sorting,
    endpointPrivilegesLoading,
    policyItems,
    handleDeployEndpointsClick,
    selectedPolicyId,
    handleSelectableOnChange,
    handleCreatePolicyClick,
  ]);

  const hideHeader = !(endpointsExist && isInitialized && !listError);

  return (
    <AdministrationListPage
      data-test-subj="endpointPage"
      hideHeader={hideHeader}
      title={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.list.pageTitle"
          defaultMessage="Endpoints"
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.list.pageSubTitle"
          defaultMessage="Hosts running Elastic Defend"
        />
      }
      headerBackComponent={<BackToPolicyListButton backLink={routeState.backLink} />}
    >
      {hasSelectedEndpoint && <EndpointDetailsFlyout />}
      {isInitialized && !listError && (
        <>
          <TransformFailedCallout
            metadataTransformStats={metadataTransformStats}
            hasNoPolicyData={!hasPolicyData}
          />
          <EuiFlexGroup gutterSize="s" alignItems="center">
            {shouldShowKQLBar && (
              <EuiFlexItem>
                <AdminSearchBar />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false} style={refreshStyle}>
              <StyledDatePicker>
                <EuiSuperDatePicker
                  className="endpointListDatePicker"
                  onTimeChange={onTimeChange}
                  isDisabled={hasSelectedEndpoint}
                  onRefresh={onRefresh}
                  isPaused={refreshIsPaused}
                  refreshInterval={refreshInterval}
                  onRefreshChange={onRefreshChange}
                  isAutoRefreshOnly={true}
                />
              </StyledDatePicker>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}
      {hasListData && (
        <>
          <EuiText color="subdued" size="xs" data-test-subj="endpointListTableTotal">
            {totalItemCount > MAX_PAGINATED_ITEM + 1 ? (
              <FormattedMessage
                id="xpack.securitySolution.endpoint.list.totalCount.limited"
                defaultMessage="Showing {limit} of {totalItemCount, plural, one {# endpoint} other {# endpoints}}"
                values={{ totalItemCount, limit: MAX_PAGINATED_ITEM + 1 }}
              />
            ) : (
              <FormattedMessage
                id="xpack.securitySolution.endpoint.list.totalCount"
                defaultMessage="Showing {totalItemCount, plural, one {# endpoint} other {# endpoints}}"
                values={{ totalItemCount }}
              />
            )}
          </EuiText>
          <EuiHorizontalRule margin="xs" />
        </>
      )}
      {renderTableOrEmptyState}
    </AdministrationListPage>
  );
};
