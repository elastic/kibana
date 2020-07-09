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
  EuiTitle,
  EuiSpacer,
  EuiLink,
  EuiHealth,
  EuiToolTip,
  EuiSelectableProps,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { createStructuredSelector } from 'reselect';
import { useDispatch } from 'react-redux';
import { HostDetailsFlyout } from './details';
import * as selectors from '../store/selectors';
import { useHostSelector } from './hooks';
import {
  HOST_STATUS_TO_HEALTH_COLOR,
  POLICY_STATUS_TO_HEALTH_COLOR,
  POLICY_STATUS_TO_TEXT,
} from './host_constants';
import { useNavigateByRouterEventHandler } from '../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { CreateStructuredSelector } from '../../../../common/store';
import { Immutable, HostInfo } from '../../../../../common/endpoint/types';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { ManagementPageView } from '../../../components/management_page_view';
import { PolicyEmptyState, HostsEmptyState } from '../../../components/management_empty_state';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { useNavigateToAppEventHandler } from '../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import {
  CreatePackageConfigRouteState,
  AgentConfigDetailsDeployAgentAction,
} from '../../../../../../ingest_manager/public';
import { SecurityPageName } from '../../../../app/types';
import { getHostListPath, getHostDetailsPath, getPolicyDetailPath } from '../../../common/routing';
import { useFormatUrl } from '../../../../common/components/link_to';
import { HostAction } from '../store/action';

const HostListNavLink = memo<{
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
HostListNavLink.displayName = 'HostListNavLink';

const selector = (createStructuredSelector as CreateStructuredSelector)(selectors);
export const HostList = () => {
  const history = useHistory();
  const {
    listData,
    pageIndex,
    pageSize,
    totalHits: totalItemCount,
    listLoading: loading,
    listError,
    uiQueryParams: queryParams,
    hasSelectedHost,
    policyItems,
    selectedPolicyId,
    policyItemsLoading,
    endpointPackageVersion,
  } = useHostSelector(selector);
  const { formatUrl, search } = useFormatUrl(SecurityPageName.management);

  const dispatch = useDispatch<(a: HostAction) => void>();

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
      // FIXME: PT: if host details is open, table is not displaying correct number of rows
      history.push(
        getHostListPath({
          name: 'hostList',
          ...queryParams,
          page_index: JSON.stringify(index),
          page_size: JSON.stringify(size),
        })
      );
    },
    [history, queryParams]
  );

  const handleCreatePolicyClick = useNavigateToAppEventHandler<CreatePackageConfigRouteState>(
    'ingestManager',
    {
      path: `#/integrations${
        endpointPackageVersion ? `/endpoint-${endpointPackageVersion}/add-integration` : ''
      }`,
      state: {
        onCancelNavigateTo: [
          'securitySolution:management',
          { path: getHostListPath({ name: 'hostList' }) },
        ],
        onCancelUrl: formatUrl(getHostListPath({ name: 'hostList' })),
        onSaveNavigateTo: [
          'securitySolution:management',
          { path: getHostListPath({ name: 'hostList' }) },
        ],
      },
    }
  );

  const handleDeployEndpointsClick = useNavigateToAppEventHandler<
    AgentConfigDetailsDeployAgentAction
  >('ingestManager', {
    path: `#/configs/${selectedPolicyId}?openEnrollmentFlyout=true`,
    state: {
      onDoneNavigateTo: [
        'securitySolution:management',
        { path: getHostListPath({ name: 'hostList' }) },
      ],
    },
  });

  const selectionOptions = useMemo<EuiSelectableProps['options']>(() => {
    return policyItems.map((item) => {
      return {
        key: item.config_id,
        label: item.name,
        checked: selectedPolicyId === item.config_id ? 'on' : undefined,
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
    const lastActiveColumnName = i18n.translate('xpack.securitySolution.endpointList.lastActive', {
      defaultMessage: 'Last Active',
    });

    return [
      {
        field: 'metadata.host',
        name: i18n.translate('xpack.securitySolution.endpointList.hostname', {
          defaultMessage: 'Hostname',
        }),
        render: ({ hostname, id }: HostInfo['metadata']['host']) => {
          const toRoutePath = getHostDetailsPath(
            {
              ...queryParams,
              name: 'hostDetails',
              selected_host: id,
            },
            search
          );
          const toRouteUrl = formatUrl(toRoutePath);
          return (
            <HostListNavLink
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
        name: i18n.translate('xpack.securitySolution.endpointList.hostStatus', {
          defaultMessage: 'Host Status',
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
                id="xpack.securitySolution.endpointList.hostStatusValue"
                defaultMessage="{hostStatus, select, online {Online} error {Error} other {Offline}}"
                values={{ hostStatus }}
              />
            </EuiHealth>
          );
        },
      },
      {
        field: 'metadata.Endpoint.policy.applied',
        name: i18n.translate('xpack.securitySolution.endpointList.policy', {
          defaultMessage: 'Policy',
        }),
        truncateText: true,
        // eslint-disable-next-line react/display-name
        render: (policy: HostInfo['metadata']['Endpoint']['policy']['applied']) => {
          const toRoutePath = getPolicyDetailPath(policy.id);
          const toRouteUrl = formatUrl(toRoutePath);
          return (
            <HostListNavLink
              name={policy.name}
              href={toRouteUrl}
              route={toRoutePath}
              dataTestSubj="policyNameCellLink"
            />
          );
        },
      },
      {
        field: 'metadata.Endpoint.policy.applied',
        name: i18n.translate('xpack.securitySolution.endpointList.policyStatus', {
          defaultMessage: 'Policy Status',
        }),
        // eslint-disable-next-line react/display-name
        render: (policy: HostInfo['metadata']['Endpoint']['policy']['applied'], item: HostInfo) => {
          const toRoutePath = getHostDetailsPath({
            name: 'hostPolicyResponse',
            selected_host: item.metadata.host.id,
          });
          const toRouteUrl = formatUrl(toRoutePath);
          return (
            <EuiHealth
              color={POLICY_STATUS_TO_HEALTH_COLOR[policy.status]}
              className="eui-textTruncate"
              data-test-subj="rowPolicyStatus"
            >
              <HostListNavLink
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
        name: i18n.translate('xpack.securitySolution.endpointList.os', {
          defaultMessage: 'Operating System',
        }),
        truncateText: true,
      },
      {
        field: 'metadata.host.ip',
        name: i18n.translate('xpack.securitySolution.endpointList.ip', {
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
        name: i18n.translate('xpack.securitySolution.endpointList.endpointVersion', {
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
    if (!loading && listData && listData.length > 0) {
      return (
        <EuiBasicTable
          data-test-subj="hostListTable"
          items={[...listData]}
          columns={columns}
          error={listError?.message}
          pagination={paginationSetup}
          onChange={onTableChange}
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
    listData,
    policyItems,
    columns,
    loading,
    paginationSetup,
    onTableChange,
    listError?.message,
    handleCreatePolicyClick,
    handleDeployEndpointsClick,
    handleSelectableOnChange,
    selectedPolicyId,
    selectionOptions,
    policyItemsLoading,
  ]);

  return (
    <ManagementPageView
      viewType="list"
      data-test-subj="hostPage"
      headerLeft={
        <>
          <EuiTitle size="l">
            <h1 data-test-subj="pageViewHeaderLeftTitle">
              <FormattedMessage
                id="xpack.securitySolution.hostList.pageTitle"
                defaultMessage="Hosts"
              />
            </h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.hostList.pageSubTitle"
                defaultMessage="Hosts running the Elastic Endpoint"
              />
            </p>
          </EuiText>
        </>
      }
    >
      {hasSelectedHost && <HostDetailsFlyout />}
      {listData && listData.length > 0 && (
        <>
          <EuiText color="subdued" size="xs" data-test-subj="hostListTableTotal">
            <FormattedMessage
              id="xpack.securitySolution.endpointList.totalCount"
              defaultMessage="{totalItemCount, plural, one {# Host} other {# Hosts}}"
              values={{ totalItemCount }}
            />
          </EuiText>
          <EuiHorizontalRule margin="xs" />
        </>
      )}
      {renderTableOrEmptyState}
      <SpyRoute pageName={SecurityPageName.management} />
    </ManagementPageView>
  );
};
