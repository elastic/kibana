/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, memo, useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  EuiHorizontalRule,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiText,
  EuiLink,
  EuiHealth,
  EuiToolTip,
  EuiSelectableProps,
  EuiSuperDatePicker,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { createStructuredSelector } from 'reselect';
import { useDispatch } from 'react-redux';
import { EndpointDetailsFlyout } from './details';
import * as selectors from '../store/selectors';
import { useEndpointSelector } from './hooks';
import { isPolicyOutOfDate } from '../utils';
import { POLICY_STATUS_TO_HEALTH_COLOR, POLICY_STATUS_TO_TEXT } from './host_constants';
import { useNavigateByRouterEventHandler } from '../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { CreateStructuredSelector } from '../../../../common/store';
import { Immutable, HostInfo, PolicyDetailsRouteState } from '../../../../../common/endpoint/types';
import { DEFAULT_POLL_INTERVAL, MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../common/constants';
import { PolicyEmptyState, HostsEmptyState } from '../../../components/management_empty_state';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { useNavigateToAppEventHandler } from '../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { EndpointPolicyLink } from '../../../components/endpoint_policy_link';
import {
  CreatePackagePolicyRouteState,
  AgentPolicyDetailsDeployAgentAction,
  pagePathGetters,
} from '../../../../../../fleet/public';
import { SecurityPageName } from '../../../../app/types';
import {
  getEndpointListPath,
  getEndpointDetailsPath,
  getPoliciesPath,
} from '../../../common/routing';
import { useFormatUrl } from '../../../../common/components/link_to';
import { useAppUrl } from '../../../../common/lib/kibana/hooks';
import { EndpointAction } from '../store/action';
import { OutOfDate } from './components/out_of_date';
import { AdminSearchBar } from './components/search_bar';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { LinkToApp } from '../../../../common/components/endpoint/link_to_app';
import { TableRowActions } from './components/table_row_actions';
import { EndpointAgentStatus } from './components/endpoint_agent_status';
import { CallOut } from '../../../../common/components/callouts';
import { metadataTransformPrefix } from '../../../../../common/endpoint/constants';
import { WARNING_TRANSFORM_STATES, APP_UI_ID } from '../../../../../common/constants';
import {
  BackToExternalAppButton,
  BackToExternalAppButtonProps,
} from '../../../components/back_to_external_app_button/back_to_external_app_button';

const MAX_PAGINATED_ITEM = 9999;
const TRANSFORM_URL = '/data/transform';

const StyledDatePicker = styled.div`
  .euiFormControlLayout--group {
    background-color: rgba(0, 119, 204, 0.2);
  }

  .euiDatePickerRange--readOnly {
    background-color: ${(props) => props.theme.eui.euiFormBackgroundColor};
  }
`;
const EndpointListNavLink = memo<{
  name: string;
  href: string;
  route: string;
  dataTestSubj: string;
}>(({ name, href, route, dataTestSubj }) => {
  const clickHandler = useNavigateByRouterEventHandler(route);

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink
      data-test-subj={dataTestSubj}
      className="eui-displayInline eui-textTruncate"
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
    metadataTransformStats,
  } = useEndpointSelector(selector);
  const { search } = useFormatUrl(SecurityPageName.administration);
  const { getAppUrl } = useAppUrl();
  const dispatch = useDispatch<(a: EndpointAction) => void>();
  // cap ability to page at 10k records. (max_result_window)
  const maxPageCount = totalItemCount > MAX_PAGINATED_ITEM ? MAX_PAGINATED_ITEM : totalItemCount;
  const [showTransformFailedCallout, setShowTransformFailedCallout] = useState(false);
  const [shouldCheckTransforms, setShouldCheckTransforms] = useState(true);

  const { state: routeState = {} } = useLocation<PolicyDetailsRouteState>();

  const backLinkOptions = useMemo<BackToExternalAppButtonProps>(() => {
    if (routeState?.backLink) {
      return {
        onBackButtonNavigateTo: routeState.backLink.navigateTo,
        backButtonLabel: routeState.backLink.label,
        backButtonUrl: routeState.backLink.href,
      };
    }

    const policyListPath = getPoliciesPath();

    return {
      backButtonLabel: i18n.translate('xpack.securitySolution.endpoint.list.backToPolicyButton', {
        defaultMessage: 'Back to policy list',
      }),
      backButtonUrl: getAppUrl({ path: policyListPath }),
      onBackButtonNavigateTo: [
        APP_UI_ID,
        {
          path: policyListPath,
        },
      ],
    };
  }, [getAppUrl, routeState?.backLink]);

  const backToPolicyList = (
    <BackToExternalAppButton {...backLinkOptions} data-test-subj="endpointListBackLink" />
  );

  useEffect(() => {
    // if no endpoint policy, skip transform check
    if (!shouldCheckTransforms || !policyItems || !policyItems.length) {
      return;
    }

    dispatch({ type: 'loadMetadataTransformStats' });
    setShouldCheckTransforms(false);
  }, [policyItems, shouldCheckTransforms, dispatch]);

  useEffect(() => {
    const hasFailure = metadataTransformStats.some((transform) =>
      WARNING_TRANSFORM_STATES.has(transform?.state)
    );
    setShowTransformFailedCallout(hasFailure);
  }, [metadataTransformStats]);

  const closeTransformFailedCallout = useCallback(() => {
    setShowTransformFailedCallout(false);
  }, []);

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
      path: `/integrations/${
        endpointPackageVersion ? `/endpoint-${endpointPackageVersion}` : ''
      }/add-integration`,
      state: {
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

  const handleDeployEndpointsClick =
    useNavigateToAppEventHandler<AgentPolicyDetailsDeployAgentAction>('fleet', {
      path: `/policies/${selectedPolicyId}?openEnrollmentFlyout=true`,
      state: {
        onDoneNavigateTo: [APP_UI_ID, { path: getEndpointListPath({ name: 'endpointList' }) }],
      },
    });

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
      defaultMessage: 'Last active',
    });

    return [
      {
        field: 'metadata',
        width: '15%',
        name: i18n.translate('xpack.securitySolution.endpoint.list.hostname', {
          defaultMessage: 'Endpoint',
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
        field: 'host_status',
        width: '14%',
        name: i18n.translate('xpack.securitySolution.endpoint.list.hostStatus', {
          defaultMessage: 'Agent status',
        }),
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
          defaultMessage: 'Policy',
        }),
        truncateText: true,
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
          defaultMessage: 'Policy status',
        }),
        render: (policy: HostInfo['metadata']['Endpoint']['policy']['applied'], item: HostInfo) => {
          const toRoutePath = getEndpointDetailsPath({
            name: 'endpointPolicyResponse',
            ...queryParams,
            selected_endpoint: item.metadata.agent.id,
          });
          const toRouteUrl = getAppUrl({ path: toRoutePath });
          return (
            <EuiToolTip
              content={POLICY_STATUS_TO_TEXT[policy.status]}
              anchorClassName="eui-textTruncate"
            >
              <EuiHealth
                color={POLICY_STATUS_TO_HEALTH_COLOR[policy.status]}
                className="eui-textTruncate eui-fullWidth"
                data-test-subj="rowPolicyStatus"
              >
                <EndpointListNavLink
                  name={POLICY_STATUS_TO_TEXT[policy.status]}
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
        field: 'metadata.host.os.name',
        width: '9%',
        name: i18n.translate('xpack.securitySolution.endpoint.list.os', {
          defaultMessage: 'OS',
        }),
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
        field: 'metadata.host.ip',
        width: '12%',
        name: i18n.translate('xpack.securitySolution.endpoint.list.ip', {
          defaultMessage: 'IP address',
        }),
        render: (ip: string[]) => {
          return (
            <EuiToolTip
              content={ip.toString().replace(',', ', ')}
              anchorClassName="eui-textTruncate"
            >
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
        field: 'metadata.agent.version',
        width: '9%',
        name: i18n.translate('xpack.securitySolution.endpoint.list.endpointVersion', {
          defaultMessage: 'Version',
        }),
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
        field: 'metadata.@timestamp',
        name: lastActiveColumnName,
        width: '9%',
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
        width: '8%',
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
  }, [queryParams, search, getAppUrl, PAD_LEFT]);

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
    return { display: endpointsExist ? 'flex' : 'none', maxWidth: 200 };
  }, [endpointsExist]);

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
    return endpointsExist && !patternsError;
  }, [endpointsExist, patternsError]);

  const transformFailedCalloutDescription = useMemo(() => {
    const failingTransformIds = metadataTransformStats
      .filter((transformStat) => WARNING_TRANSFORM_STATES.has(transformStat.state))
      .map((transformStat) => transformStat.id)
      .join(', ');

    return (
      <>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.list.transformFailed.message"
          defaultMessage="A required transform, {transformId}, is currently failing. Most of the time this can be fixed by {transformsPage}. For additional help, please visit the {docsPage}"
          values={{
            transformId: failingTransformIds || metadataTransformPrefix,
            transformsPage: (
              <LinkToApp
                data-test-subj="failed-transform-restart-link"
                appId="management"
                appPath={TRANSFORM_URL}
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.list.transformFailed.restartLink"
                  defaultMessage="restarting the transform"
                />
              </LinkToApp>
            ),
            docsPage: (
              <EuiLink
                data-test-subj="failed-transform-docs-link"
                href={services?.docLinks?.links.endpoints.troubleshooting}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.list.transformFailed.docsLink"
                  defaultMessage="troubleshooting documentation"
                />
              </EuiLink>
            ),
          }}
        />
        <EuiSpacer size="s" />
      </>
    );
  }, [metadataTransformStats, services?.docLinks?.links.endpoints.troubleshooting]);

  const transformFailedCallout = useMemo(() => {
    if (!showTransformFailedCallout) {
      return;
    }

    return (
      <>
        <CallOut
          message={{
            id: 'endpoints-list-transform-failed',
            type: 'warning',
            title: i18n.translate('xpack.securitySolution.endpoint.list.transformFailed.title', {
              defaultMessage: 'Required transform failed',
            }),
            description: transformFailedCalloutDescription,
          }}
          dismissButtonText={i18n.translate(
            'xpack.securitySolution.endpoint.list.transformFailed.dismiss',
            {
              defaultMessage: 'Dismiss',
            }
          )}
          onDismiss={closeTransformFailedCallout}
          showDismissButton={true}
        />
        <EuiSpacer size="m" />
      </>
    );
  }, [showTransformFailedCallout, closeTransformFailedCallout, transformFailedCalloutDescription]);

  return (
    <AdministrationListPage
      data-test-subj="endpointPage"
      title={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.list.pageTitle"
          defaultMessage="Endpoints"
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.list.pageSubTitle"
          defaultMessage="Hosts running endpoint security"
        />
      }
      headerBackComponent={routeState.backLink && backToPolicyList}
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
                      appPath={`#${pagePathGetters.agent_list({
                        kuery: 'packages : "endpoint"',
                      })}`}
                      href={`${services?.application?.getUrlForApp(
                        'fleet'
                      )}#${pagePathGetters.agent_list({
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
        {transformFailedCallout}
        <EuiFlexGroup gutterSize="s">
          {shouldShowKQLBar && (
            <EuiFlexItem>
              <AdminSearchBar />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false} style={refreshStyle}>
            <StyledDatePicker>
              <EuiSuperDatePicker
                className="endpointListDatePicker"
                onTimeChange={NOOP}
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
