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
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { createStructuredSelector } from 'reselect';

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
import { getManagementUrl } from '../../..';
import { FormattedDate } from '../../../../common/components/formatted_date';

const HostLink = memo<{
  name: string;
  href: string;
  route: string;
}>(({ name, href, route }) => {
  const clickHandler = useNavigateByRouterEventHandler(route);

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink
      data-test-subj="hostnameCellLink"
      className="eui-textTruncate"
      href={href}
      onClick={clickHandler}
    >
      {name}
    </EuiLink>
  );
});
HostLink.displayName = 'HostLink';

const PolicyDetailsLink = memo<{
  name: string;
  href: string;
  route: string;
}>(({ name, href, route }) => {
  const clickHandler = useNavigateByRouterEventHandler(route);

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink
      data-test-subj="policyNameCellLink"
      className="eui-textTruncate"
      href={href}
      onClick={clickHandler}
    >
      {name}
    </EuiLink>
  );
});
PolicyDetailsLink.displayName = 'PolicyDetailsLink';

const PolicyResponseLink = memo<{
  name: string;
  href: string;
  route: string;
}>(({ name, href, route }) => {
  const clickHandler = useNavigateByRouterEventHandler(route);

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink
      data-test-subj="policyStatusCellLink"
      className="eui-textTruncate"
      href={href}
      onClick={clickHandler}
    >
      {name}
    </EuiLink>
  );
});
PolicyResponseLink.displayName = 'PolicyResponseLink';

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
  } = useHostSelector(selector);

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
        getManagementUrl({
          name: 'endpointList',
          excludePrefix: true,
          ...queryParams,
          page_index: JSON.stringify(index),
          page_size: JSON.stringify(size),
        })
      );
    },
    [history, queryParams]
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
          const toRoutePath = getManagementUrl({
            ...queryParams,
            name: 'endpointDetails',
            selected_host: id,
            excludePrefix: true,
          });
          const toRouteUrl = getManagementUrl({
            ...queryParams,
            name: 'endpointDetails',
            selected_host: id,
          });
          return <HostLink name={hostname} href={toRouteUrl} route={toRoutePath} />;
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
        field: 'metadata.endpoint.policy.applied',
        name: i18n.translate('xpack.securitySolution.endpointList.policy', {
          defaultMessage: 'Policy',
        }),
        truncateText: true,
        // eslint-disable-next-line react/display-name
        render: (policy: HostInfo['metadata']['endpoint']['policy']['applied']) => {
          const toRoutePath = getManagementUrl({
            name: 'policyDetails',
            policyId: policy.id,
            excludePrefix: true,
          });
          const toRouteUrl = getManagementUrl({
            name: 'policyDetails',
            policyId: policy.id,
          });
          return <PolicyDetailsLink name={policy.name} href={toRouteUrl} route={toRoutePath} />;
        },
      },
      {
        field: 'metadata.endpoint.policy.applied',
        name: i18n.translate('xpack.securitySolution.endpointList.policyStatus', {
          defaultMessage: 'Policy Status',
        }),
        // eslint-disable-next-line react/display-name
        render: (policy: HostInfo['metadata']['endpoint']['policy']['applied'], item: HostInfo) => {
          const toRoutePath = getManagementUrl({
            name: 'endpointPolicyResponse',
            selected_host: item.metadata.host.id,
            excludePrefix: true,
          });
          const toRouteUrl = getManagementUrl({
            name: 'endpointPolicyResponse',
            selected_host: item.metadata.host.id,
          });
          return (
            <EuiHealth
              color={POLICY_STATUS_TO_HEALTH_COLOR[policy.status]}
              className="eui-textTruncate"
            >
              <PolicyResponseLink
                name={POLICY_STATUS_TO_TEXT[policy.status]}
                href={toRouteUrl}
                route={toRoutePath}
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
  }, [queryParams]);

  return (
    <ManagementPageView
      viewType="list"
      data-test-subj="hostPage"
      headerLeft={i18n.translate('xpack.securitySolution.endpointLis.pageTitle', {
        defaultMessage: 'Endpoints',
      })}
    >
      {hasSelectedHost && <HostDetailsFlyout />}
      <EuiText color="subdued" size="xs" data-test-subj="hostListTableTotal">
        <FormattedMessage
          id="xpack.securitySolution.endpointList.totalCount"
          defaultMessage="{totalItemCount, plural, one {# Host} other {# Hosts}}"
          values={{ totalItemCount }}
        />
      </EuiText>
      <EuiHorizontalRule margin="xs" />
      <EuiBasicTable
        data-test-subj="hostListTable"
        items={useMemo(() => [...listData], [listData])}
        columns={columns}
        loading={loading}
        error={listError?.message}
        pagination={paginationSetup}
        onChange={onTableChange}
      />
      <SpyRoute />
    </ManagementPageView>
  );
};
