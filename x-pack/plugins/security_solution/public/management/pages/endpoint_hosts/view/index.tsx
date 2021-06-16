/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, memo, useContext } from 'react';
import {
  EuiHorizontalRule,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiText,
  EuiLink,
  EuiBadge,
  EuiToolTip,
  EuiSelectableProps,
  EuiSuperDatePicker,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { createStructuredSelector } from 'reselect';
import { useDispatch } from 'react-redux';
import { ThemeContext } from 'styled-components';
import { EndpointDetailsFlyout } from './details';
import * as selectors from '../store/selectors';
import { useEndpointSelector } from './hooks';
import { isPolicyOutOfDate } from '../utils';
import { POLICY_STATUS_TO_BADGE_COLOR, POLICY_STATUS_TO_TEXT } from './host_constants';
import { useNavigateByRouterEventHandler } from '../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { CreateStructuredSelector } from '../../../../common/store';
import { Immutable, HostInfo } from '../../../../../common/endpoint/types';
import { DEFAULT_POLL_INTERVAL, MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../common/constants';
import { PolicyEmptyState, HostsEmptyState } from '../../../components/management_empty_state';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { useNavigateToAppEventHandler } from '../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import {
  CreatePackagePolicyRouteState,
  AgentPolicyDetailsDeployAgentAction,
  pagePathGetters,
} from '../../../../../../fleet/public';
import { SecurityPageName } from '../../../../app/types';
import { getEndpointListPath, getEndpointDetailsPath } from '../../../common/routing';
import { useFormatUrl } from '../../../../common/components/link_to';
import { EndpointAction } from '../store/action';
import { EndpointPolicyLink } from './components/endpoint_policy_link';
import { OutOfDate } from './components/out_of_date';
import { AdminSearchBar } from './components/search_bar';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { LinkToApp } from '../../../../common/components/endpoint/link_to_app';
import { TableRowActions } from './components/table_row_actions';
import { EndpointAgentStatus } from './components/endpoint_agent_status';

const MAX_PAGINATED_ITEM = 9999;

const EndpointListNavLink = memo<{
  name: string;
  href: string;
  route: string;
  isBadge?: boolean;
  dataTestSubj: string;
}>(({ name, href, route, isBadge = false, dataTestSubj }) => {
  const clickHandler = useNavigateByRouterEventHandler(route);
  const theme = useContext(ThemeContext);

  return isBadge ? (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink
      data-test-subj={dataTestSubj}
      className="eui-textTruncate"
      href={href}
      onClick={clickHandler}
      style={{ color: theme.eui.euiColorInk }}
    >
      {name}
    </EuiLink>
  ) : (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink
      data-test-subj={dataTestSubj}
      className="eui-textTruncate"
      href={href}
      onClick={clickHandler}
    >
      {name}
    </EuiLink>
  );
});
EndpointListNavLink.displayName = 'EndpointListNavLink';

// FIXME: this needs refactoring - we are pulling in all selectors from endpoint, which includes many more than what the list uses
const selector = (createStructuredSelector as CreateStructuredSelector)(selectors);
export const EndpointList = () => {
  const history = useHistory();
  const { services } = useKibana();
  const {
    listData,
    pageIndex,
    pageSize,
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
    areEndpointsEnrolling,
    agentsWithEndpointsTotalError,
    endpointsTotalError,
    isTransformEnabled,
  } = useEndpointSelector(selector);
  const { formatUrl, search } = useFormatUrl(SecurityPageName.administration);
  const dispatch = useDispatch<(a: EndpointAction) => void>();
  // cap ability to page at 10k records. (max_result_window)
  const maxPageCount = totalItemCount > MAX_PAGINATED_ITEM ? MAX_PAGINATED_ITEM : totalItemCount;

  const paginationSetup = useMemo(() => {
    return {
      pageIndex,
      pageSize,
      totalItemCount: maxPageCount,
      pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
      hidePerPageOptions: false,
    };
  }, [pageIndex, pageSize, maxPageCount]);

  const onTableChange = useCallback(
    ({ page }: { page: { index: number; size: number } }) => {
      const { index, size } = page;
      // FIXME: PT: if endpoint details is open, table is not displaying correct number of rows
      history.push(
        getEndpointListPath({
          name: 'endpointList',
          ...queryParams,
          page_index: JSON.stringify(index),
          page_size: JSON.stringify(size),
        })
      );
    },
    [history, queryParams]
  );

  const handleCreatePolicyClick = useNavigateToAppEventHandler<CreatePackagePolicyRouteState>(
    'fleet',
    {
      path: `#/integrations/${
        endpointPackageVersion ? `/endpoint-${endpointPackageVersion}` : ''
      }/add-integration`,
      state: {
        onCancelNavigateTo: [
          'securitySolution:administration',
          { path: getEndpointListPath({ name: 'endpointList' }) },
        ],
        onCancelUrl: formatUrl(getEndpointListPath({ name: 'endpointList' })),
        onSaveNavigateTo: [
          'securitySolution:administration',
          { path: getEndpointListPath({ name: 'endpointList' }) },
        ],
      },
    }
  );

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

  const NOOP = useCallback(() => {}, []);

  const PAD_LEFT: React.CSSProperties = useMemo(() => ({ paddingLeft: '6px' }), []);

  const handleDeployEndpointsClick = useNavigateToAppEventHandler<AgentPolicyDetailsDeployAgentAction>(
    'fleet',
    {
      path: `#/policies/${selectedPolicyId}?openEnrollmentFlyout=true`,
      state: {
        onDoneNavigateTo: [
          'securitySolution:administration',
          { path: getEndpointListPath({ name: 'endpointList' }) },
        ],
      },
    }
  );

  const selectionOptions = useMemo<EuiSelectableProps['options']>(() => {
    return policyItems.map((item) => {
      return {
        key: item.policy_id,
        label: item.name,
        checked: selectedPolicyId === item.policy_id ? 'on' : undefined,
      };
    });
  }, [policyItems, selectedPolicyId]);

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

  const columns: Array<EuiBasicTableColumn<Immutable<HostInfo>>> = useMemo(() => {
    const lastActiveColumnName = i18n.translate('xpack.securitySolution.endpoint.list.lastActive', {
      defaultMessage: 'Last Active',
    });

    return [
      {
        field: 'metadata',
        name: i18n.translate('xpack.securitySolution.endpoint.list.hostname', {
          defaultMessage: 'Hostname',
        }),
        render: ({ host: { hostname }, agent: { id } }: HostInfo['metadata']) => {
          const toRoutePath = getEndpointDetailsPath(
            {
              ...queryParams,
              name: 'endpointDetails',
              selected_endpoint: id,
            },
            search
          );
          const toRouteUrl = formatUrl(toRoutePath);
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
        field: 'host_status',
        width: '9%',
        name: i18n.translate('xpack.securitySolution.endpoint.list.hostStatus', {
          defaultMessage: 'Agent Status',
        }),
        // eslint-disable-next-line react/display-name
        render: (hostStatus: HostInfo['host_status'], endpointInfo) => {
          return (
            <EndpointAgentStatus hostStatus={hostStatus} endpointMetadata={endpointInfo.metadata} />
          );
        },
      },
      {
        field: 'metadata.Endpoint.policy.applied',
        width: '15%',
        name: i18n.translate('xpack.securitySolution.endpoint.list.policy', {
          defaultMessage: 'Integration Policy',
        }),
        truncateText: true,
        // eslint-disable-next-line react/display-name
        render: (policy: HostInfo['metadata']['Endpoint']['policy']['applied'], item: HostInfo) => {
          return (
            <>
              <EuiToolTip content={policy.name} anchorClassName="eui-textTruncate">
                <EndpointPolicyLink
                  policyId={policy.id}
                  className="eui-textTruncate"
                  data-test-subj="policyNameCellLink"
                >
                  {policy.name}
                </EndpointPolicyLink>
              </EuiToolTip>
              {policy.endpoint_policy_version && (
                <EuiText
                  color="subdued"
                  size="xs"
                  style={{ whiteSpace: 'nowrap', ...PAD_LEFT }}
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
                <OutOfDate style={PAD_LEFT} data-test-subj="rowPolicyOutOfDate" />
              )}
            </>
          );
        },
      },
      {
        field: 'metadata.Endpoint.policy.applied',
        width: '9%',
        name: i18n.translate('xpack.securitySolution.endpoint.list.policyStatus', {
          defaultMessage: 'Policy Status',
        }),
        render: (policy: HostInfo['metadata']['Endpoint']['policy']['applied'], item: HostInfo) => {
          const toRoutePath = getEndpointDetailsPath({
            name: 'endpointPolicyResponse',
            ...queryParams,
            selected_endpoint: item.metadata.agent.id,
          });
          const toRouteUrl = formatUrl(toRoutePath);
          return (
            <EuiBadge
              color={POLICY_STATUS_TO_BADGE_COLOR[policy.status]}
              className="eui-textTruncate"
              data-test-subj="rowPolicyStatus"
            >
              <EndpointListNavLink
                name={POLICY_STATUS_TO_TEXT[policy.status]}
                href={toRouteUrl}
                route={toRoutePath}
                isBadge
                dataTestSubj="policyStatusCellLink"
              />
            </EuiBadge>
          );
        },
      },
      {
        field: 'metadata.host.os.name',
        width: '10%',
        name: i18n.translate('xpack.securitySolution.endpoint.list.os', {
          defaultMessage: 'Operating System',
        }),
        truncateText: true,
      },
      {
        field: 'metadata.host.ip',
        name: i18n.translate('xpack.securitySolution.endpoint.list.ip', {
          defaultMessage: 'IP Address',
        }),
        // eslint-disable-next-line react/display-name
        render: (ip: string[]) => {
          return (
            <EuiToolTip content={ip.toString().replace(',', ', ')} anchorClassName="eui-fullWidth">
              <EuiText size="s" className="eui-fullWidth">
                <span className="eui-textTruncate eui-fullWidth">
                  {ip.toString().replace(',', ', ')}
                </span>
              </EuiText>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'metadata.agent.version',
        width: '5%',
        name: i18n.translate('xpack.securitySolution.endpoint.list.endpointVersion', {
          defaultMessage: 'Version',
        }),
      },
      {
        field: 'metadata.@timestamp',
        name: lastActiveColumnName,
        render(dateValue: HostInfo['metadata']['@timestamp']) {
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
        width: '5%',
        name: i18n.translate('xpack.securitySolution.endpoint.list.actions', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            // eslint-disable-next-line react/display-name
            render: (item: HostInfo) => {
              return <TableRowActions endpointMetadata={item.metadata} />;
            },
          },
        ],
      },
    ];
  }, [queryParams, search, formatUrl, PAD_LEFT]);

  const renderTableOrEmptyState = useMemo(() => {
    if (endpointsExist || areEndpointsEnrolling) {
      return (
        <EuiBasicTable
          data-test-subj="endpointListTable"
          items={[...listData]}
          columns={columns}
          error={listError?.message}
          pagination={paginationSetup}
          onChange={onTableChange}
          loading={loading}
        />
      );
    } else if (!policyItemsLoading && policyItems && policyItems.length > 0) {
      return (
        <HostsEmptyState
          loading={loading}
          onActionClick={handleDeployEndpointsClick}
          actionDisabled={selectedPolicyId === undefined}
          handleSelectableOnChange={handleSelectableOnChange}
          selectionOptions={selectionOptions}
        />
      );
    } else {
      return (
        <PolicyEmptyState loading={policyItemsLoading} onActionClick={handleCreatePolicyClick} />
      );
    }
  }, [
    loading,
    endpointsExist,
    policyItemsLoading,
    policyItems,
    listData,
    columns,
    listError?.message,
    paginationSetup,
    onTableChange,
    handleDeployEndpointsClick,
    selectedPolicyId,
    handleSelectableOnChange,
    selectionOptions,
    handleCreatePolicyClick,
    areEndpointsEnrolling,
  ]);

  const hasListData = listData && listData.length > 0;

  const refreshStyle = useMemo(() => {
    return { display: endpointsExist && isTransformEnabled ? 'flex' : 'none', maxWidth: 200 };
  }, [endpointsExist, isTransformEnabled]);

  const refreshIsPaused = useMemo(() => {
    return !endpointsExist ? false : hasSelectedEndpoint ? true : !isAutoRefreshEnabled;
  }, [endpointsExist, hasSelectedEndpoint, isAutoRefreshEnabled]);

  const refreshInterval = useMemo(() => {
    return !endpointsExist ? DEFAULT_POLL_INTERVAL : autoRefreshInterval;
  }, [endpointsExist, autoRefreshInterval]);

  const hasErrorFindingTotals = useMemo(() => {
    return endpointsTotalError || agentsWithEndpointsTotalError ? true : false;
  }, [endpointsTotalError, agentsWithEndpointsTotalError]);

  const shouldShowKQLBar = useMemo(() => {
    return endpointsExist && !patternsError && isTransformEnabled;
  }, [endpointsExist, patternsError, isTransformEnabled]);

  return (
    <AdministrationListPage
      data-test-subj="endpointPage"
      beta={false}
      title={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.list.pageTitle"
          defaultMessage="Endpoints"
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.list.pageSubTitle"
          defaultMessage="Hosts running Endpoint Security"
        />
      }
    >
      {hasSelectedEndpoint && <EndpointDetailsFlyout />}
      <>
        {areEndpointsEnrolling && !hasErrorFindingTotals && (
          <>
            <EuiCallOut size="s" data-test-subj="endpointsEnrollingNotification">
              <FormattedMessage
                id="xpack.securitySolution.endpoint.list.endpointsEnrolling"
                defaultMessage="Endpoints are enrolling. {agentsLink} to track progress."
                values={{
                  agentsLink: (
                    <LinkToApp
                      appId="fleet"
                      appPath={`#${pagePathGetters.fleet_agent_list({
                        kuery: 'packages : "endpoint"',
                      })}`}
                      href={`${services?.application?.getUrlForApp(
                        'fleet'
                      )}#${pagePathGetters.fleet_agent_list({
                        kuery: 'packages : "endpoint"',
                      })}`}
                    >
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.list.endpointsEnrolling.viewAgentsLink"
                        defaultMessage="View agents"
                      />
                    </LinkToApp>
                  ),
                }}
              />
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiFlexGroup>
          {shouldShowKQLBar && (
            <EuiFlexItem>
              <AdminSearchBar />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false} style={refreshStyle}>
            <EuiSuperDatePicker
              onTimeChange={NOOP}
              isDisabled={hasSelectedEndpoint}
              onRefresh={onRefresh}
              isPaused={refreshIsPaused}
              refreshInterval={refreshInterval}
              onRefreshChange={onRefreshChange}
              isAutoRefreshOnly={true}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
      </>
      {hasListData && (
        <>
          <EuiText color="subdued" size="xs" data-test-subj="endpointListTableTotal">
            {totalItemCount > MAX_PAGINATED_ITEM + 1 ? (
              <FormattedMessage
                id="xpack.securitySolution.endpoint.list.totalCount.limited"
                defaultMessage="Showing {limit} of {totalItemCount, plural, one {# Host} other {# Hosts}}"
                values={{ totalItemCount, limit: MAX_PAGINATED_ITEM + 1 }}
              />
            ) : (
              <FormattedMessage
                id="xpack.securitySolution.endpoint.list.totalCount"
                defaultMessage="{totalItemCount, plural, one {# Host} other {# Hosts}}"
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
