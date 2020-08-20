/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback, memo } from 'react';
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
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { createStructuredSelector } from 'reselect';
import { useDispatch } from 'react-redux';
import { EndpointDetailsFlyout } from './details';
import * as selectors from '../store/selectors';
import { useEndpointSelector } from './hooks';
import {
  HOST_STATUS_TO_HEALTH_COLOR,
  POLICY_STATUS_TO_HEALTH_COLOR,
  POLICY_STATUS_TO_TEXT,
} from './host_constants';
import { useNavigateByRouterEventHandler } from '../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { CreateStructuredSelector } from '../../../../common/store';
import { Immutable, HostInfo } from '../../../../../common/endpoint/types';
import { DEFAULT_POLL_INTERVAL } from '../../../common/constants';
import { PolicyEmptyState, HostsEmptyState } from '../../../components/management_empty_state';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { useNavigateToAppEventHandler } from '../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import {
  CreatePackagePolicyRouteState,
  AgentPolicyDetailsDeployAgentAction,
} from '../../../../../../ingest_manager/public';
import { SecurityPageName } from '../../../../app/types';
import { getEndpointListPath, getEndpointDetailsPath } from '../../../common/routing';
import { useFormatUrl } from '../../../../common/components/link_to';
import { EndpointAction } from '../store/action';
import { EndpointPolicyLink } from './components/endpoint_policy_link';
import { AdministrationListPage } from '../../../components/administration_list_page';

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
      className="eui-textTruncate"
      href={href}
      onClick={clickHandler}
    >
      {name}
    </EuiLink>
  );
});
EndpointListNavLink.displayName = 'EndpointListNavLink';

const selector = (createStructuredSelector as CreateStructuredSelector)(selectors);
export const EndpointList = () => {
  const history = useHistory();
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
  } = useEndpointSelector(selector);
  const { formatUrl, search } = useFormatUrl(SecurityPageName.administration);

  const dispatch = useDispatch<(a: EndpointAction) => void>();

  const paginationSetup = useMemo(() => {
    return {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [10, 20, 50],
      hidePerPageOptions: false,
    };
  }, [pageIndex, pageSize, totalItemCount]);

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
    'ingestManager',
    {
      path: `#/integrations${
        endpointPackageVersion ? `/endpoint-${endpointPackageVersion}/add-integration` : ''
      }`,
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

  const handleDeployEndpointsClick = useNavigateToAppEventHandler<
    AgentPolicyDetailsDeployAgentAction
  >('ingestManager', {
    path: `#/policies/${selectedPolicyId}?openEnrollmentFlyout=true`,
    state: {
      onDoneNavigateTo: [
        'securitySolution:administration',
        { path: getEndpointListPath({ name: 'endpointList' }) },
      ],
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
      defaultMessage: 'Last Active',
    });

    return [
      {
        field: 'metadata.host',
        name: i18n.translate('xpack.securitySolution.endpoint.list.hostname', {
          defaultMessage: 'Hostname',
        }),
        render: ({ hostname, id }: HostInfo['metadata']['host']) => {
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
            <EndpointListNavLink
              name={hostname}
              href={toRouteUrl}
              route={toRoutePath}
              dataTestSubj="hostnameCellLink"
            />
          );
        },
      },
      {
        field: 'host_status',
        name: i18n.translate('xpack.securitySolution.endpoint.list.hostStatus', {
          defaultMessage: 'Agent Status',
        }),
        // eslint-disable-next-line react/display-name
        render: (hostStatus: HostInfo['host_status']) => {
          return (
            <EuiHealth
              color={HOST_STATUS_TO_HEALTH_COLOR[hostStatus]}
              data-test-subj="rowHostStatus"
              className="eui-textTruncate"
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.list.hostStatusValue"
                defaultMessage="{hostStatus, select, online {Online} error {Error} unenrolling {Unenrolling} other {Offline}}"
                values={{ hostStatus }}
              />
            </EuiHealth>
          );
        },
      },
      {
        field: 'metadata.Endpoint.policy.applied',
        name: i18n.translate('xpack.securitySolution.endpoint.list.policy', {
          defaultMessage: 'Integration',
        }),
        truncateText: true,
        // eslint-disable-next-line react/display-name
        render: (policy: HostInfo['metadata']['Endpoint']['policy']['applied']) => {
          return (
            <EndpointPolicyLink
              policyId={policy.id}
              className="eui-textTruncate"
              data-test-subj="policyNameCellLink"
            >
              {policy.name}
            </EndpointPolicyLink>
          );
        },
      },
      {
        field: 'metadata.Endpoint.policy.applied',
        name: i18n.translate('xpack.securitySolution.endpoint.list.policyStatus', {
          defaultMessage: 'Configuration Status',
        }),
        render: (policy: HostInfo['metadata']['Endpoint']['policy']['applied'], item: HostInfo) => {
          const toRoutePath = getEndpointDetailsPath({
            name: 'endpointPolicyResponse',
            ...queryParams,
            selected_endpoint: item.metadata.host.id,
          });
          const toRouteUrl = formatUrl(toRoutePath);
          return (
            <EuiHealth
              color={POLICY_STATUS_TO_HEALTH_COLOR[policy.status]}
              className="eui-textTruncate"
              data-test-subj="rowPolicyStatus"
            >
              <EndpointListNavLink
                name={POLICY_STATUS_TO_TEXT[policy.status]}
                href={toRouteUrl}
                route={toRoutePath}
                dataTestSubj="policyStatusCellLink"
              />
            </EuiHealth>
          );
        },
      },
      {
        field: 'metadata.host.os.name',
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
    ];
  }, [formatUrl, queryParams, search]);

  const renderTableOrEmptyState = useMemo(() => {
    if (endpointsExist) {
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
  ]);

  const hasListData = listData && listData.length > 0;

  const refreshStyle = useMemo(() => {
    return { display: hasListData ? 'flex' : 'none', maxWidth: 200 };
  }, [hasListData]);

  const refreshIsPaused = useMemo(() => {
    return !hasListData ? false : hasSelectedEndpoint ? true : !isAutoRefreshEnabled;
  }, [hasListData, hasSelectedEndpoint, isAutoRefreshEnabled]);

  const refreshInterval = useMemo(() => {
    return !hasListData ? DEFAULT_POLL_INTERVAL : autoRefreshInterval;
  }, [hasListData, autoRefreshInterval]);

  return (
    <AdministrationListPage
      data-test-subj="endpointPage"
      beta={true}
      title={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.list.pageTitle"
          defaultMessage="Endpoints"
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.list.pageSubTitle"
          defaultMessage="Hosts running Elastic Endpoint Security"
        />
      }
    >
      {hasSelectedEndpoint && <EndpointDetailsFlyout />}
      {
        <>
          <div style={refreshStyle}>
            <EuiSuperDatePicker
              onTimeChange={NOOP}
              isDisabled={hasSelectedEndpoint}
              onRefresh={onRefresh}
              isPaused={refreshIsPaused}
              refreshInterval={refreshInterval}
              onRefreshChange={onRefreshChange}
              isAutoRefreshOnly={true}
            />
          </div>
          <EuiSpacer size="m" />
        </>
      }
      {hasListData && (
        <>
          <EuiText color="subdued" size="xs" data-test-subj="endpointListTableTotal">
            <FormattedMessage
              id="xpack.securitySolution.endpoint.list.totalCount"
              defaultMessage="{totalItemCount, plural, one {# Host} other {# Hosts}}"
              values={{ totalItemCount }}
            />
          </EuiText>
          <EuiHorizontalRule margin="xs" />
        </>
      )}
      {renderTableOrEmptyState}
    </AdministrationListPage>
  );
};
