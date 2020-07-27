/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback, memo } from 'react';
import {
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
import {
  HOST_STATUS_TO_HEALTH_COLOR,
  POLICY_STATUS_TO_HEALTH_COLOR,
  POLICY_STATUS_TO_TEXT,
} from './host_constants';
import { useNavigateByRouterEventHandler } from '../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { Immutable, HostInfo } from '../../../../../common/endpoint/types';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { SecurityPageName } from '../../../../app/types';
import { getHostListPath, getHostDetailsPath, getPolicyDetailPath } from '../../../common/routing';
import { useFormatUrl } from '../../../../common/components/link_to';
import { HostIndexUIQueryParams } from '../types';
import { HostPolicyLink } from './components/host_policy_link';

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

interface HostListProps {
  items: HostInfo[];
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
  error?: string;
  queryParams: Immutable<HostIndexUIQueryParams>;
}

export const HostList: React.FC<HostListProps> = ({
  items,
  pageIndex,
  pageSize,
  totalItemCount,
  error,
  queryParams,
}) => {
  const history = useHistory();

  const { formatUrl, search } = useFormatUrl(SecurityPageName.administration);

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
        render({ hostname, id }: HostInfo['metadata']['host']) {
          const toRoutePath = getHostDetailsPath(
            {
              ...queryParams,
              name: 'hostDetails',
              selected_host: id,
            },
            search
          );

          return (
            <HostListNavLink
              name={hostname}
              href={formatUrl(toRoutePath)}
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
        render(hostStatus: HostInfo['host_status']) {
          return (
            <EuiHealth
              color={HOST_STATUS_TO_HEALTH_COLOR[hostStatus]}
              data-test-subj="rowHostStatus"
              className="eui-textTruncate"
            >
              <FormattedMessage
                id="xpack.securitySolution.endpointList.hostStatusValue"
                defaultMessage="{hostStatus, select, online {Online} error {Error} unenrolling {Unenrolling} other {Offline}}"
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
        render(policy: HostInfo['metadata']['Endpoint']['policy']['applied']) {
          return (
            <HostPolicyLink
              policyId={policy.id}
              className="eui-textTruncate"
              data-test-subj="policyNameCellLink"
            >
              {policy.name}
            </HostPolicyLink>
          );
        },
      },
      {
        field: 'metadata.Endpoint.policy.applied',
        name: i18n.translate('xpack.securitySolution.endpointList.policyStatus', {
          defaultMessage: 'Policy Status',
        }),
        render(policy: HostInfo['metadata']['Endpoint']['policy']['applied'], item: HostInfo) {
          const toRoutePath = getHostDetailsPath({
            name: 'hostPolicyResponse',
            selected_host: item.metadata.host.id,
          });

          return (
            <EuiHealth
              color={POLICY_STATUS_TO_HEALTH_COLOR[policy.status]}
              className="eui-textTruncate"
              data-test-subj="rowPolicyStatus"
            >
              <HostListNavLink
                name={POLICY_STATUS_TO_TEXT[policy.status]}
                href={formatUrl(toRoutePath)}
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
        render(ip: string[]) {
          return (
            <EuiToolTip content={ip.join(', ')} anchorClassName="eui-fullWidth">
              <EuiText size="s" className="eui-fullWidth">
                <span className="eui-textTruncate eui-fullWidth">{ip.join(', ')}</span>
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

  return (
    <EuiBasicTable
      data-test-subj="hostListTable"
      items={items}
      columns={columns}
      error={error}
      pagination={paginationSetup}
      onChange={onTableChange}
    />
  );
};
