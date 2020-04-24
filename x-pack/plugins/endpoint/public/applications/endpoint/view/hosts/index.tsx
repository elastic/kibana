/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback, memo } from 'react';
import { useDispatch } from 'react-redux';
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageContent,
  EuiHorizontalRule,
  EuiTitle,
  EuiBasicTable,
  EuiText,
  EuiLink,
  EuiHealth,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { createStructuredSelector } from 'reselect';
import { EuiBasicTableColumn } from '@elastic/eui';
import { HostDetailsFlyout } from './details';
import * as selectors from '../../store/hosts/selectors';
import { HostAction } from '../../store/hosts/action';
import { useHostListSelector } from './hooks';
import { CreateStructuredSelector } from '../../types';
import { urlFromQueryParams } from './url_from_query_params';
import { HostInfo, HostStatus, Immutable } from '../../../../../common/types';
import { useNavigateByRouterEventHandler } from '../hooks/use_navigate_by_router_event_handler';

const HOST_STATUS_TO_HEALTH_COLOR = Object.freeze<
  {
    [key in HostStatus]: string;
  }
>({
  [HostStatus.ERROR]: 'danger',
  [HostStatus.ONLINE]: 'success',
  [HostStatus.OFFLINE]: 'subdued',
});

const HostLink = memo<{
  name: string;
  href: string;
  route: ReturnType<typeof urlFromQueryParams>;
}>(({ name, href, route }) => {
  const clickHandler = useNavigateByRouterEventHandler(route);

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink data-test-subj="hostnameCellLink" href={href} onClick={clickHandler}>
      {name}
    </EuiLink>
  );
});

const selector = (createStructuredSelector as CreateStructuredSelector)(selectors);
export const HostList = () => {
  const dispatch = useDispatch<(a: HostAction) => void>();
  const {
    listData,
    pageIndex,
    pageSize,
    totalHits: totalItemCount,
    isLoading,
    uiQueryParams: queryParams,
    hasSelectedHost,
  } = useHostListSelector(selector);

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
      dispatch({
        type: 'userPaginatedHostList',
        payload: { pageIndex: index, pageSize: size },
      });
    },
    [dispatch]
  );

  const columns: Array<EuiBasicTableColumn<Immutable<HostInfo>>> = useMemo(() => {
    return [
      {
        field: 'metadata.host',
        name: i18n.translate('xpack.endpoint.host.list.hostname', {
          defaultMessage: 'Hostname',
        }),
        render: ({ hostname, id }: HostInfo['metadata']['host']) => {
          const newQueryParams = urlFromQueryParams({ ...queryParams, selected_host: id });
          return (
            <HostLink name={hostname} href={'?' + newQueryParams.search} route={newQueryParams} />
          );
        },
      },
      {
        field: 'host_status',
        name: i18n.translate('xpack.endpoint.host.list.hostStatus', {
          defaultMessage: 'Host Status',
        }),
        render: (hostStatus: HostInfo['host_status']) => {
          return (
            <EuiHealth color={HOST_STATUS_TO_HEALTH_COLOR[hostStatus]}>
              <FormattedMessage
                id="xpack.endpoint.host.list.hostStatusValue"
                defaultMessage="{hostStatus, select, online {Online} error {Error} other {Offline}}"
                values={{ hostStatus }}
              />
            </EuiHealth>
          );
        },
      },
      {
        field: '',
        name: i18n.translate('xpack.endpoint.host.list.policy', {
          defaultMessage: 'Policy',
        }),
        render: () => {
          return 'Policy Name';
        },
      },
      {
        field: '',
        name: i18n.translate('xpack.endpoint.host.list.policyStatus', {
          defaultMessage: 'Policy Status',
        }),
        render: () => {
          return <EuiHealth color="success">Policy Status</EuiHealth>;
        },
      },
      {
        field: '',
        name: i18n.translate('xpack.endpoint.host.list.alerts', {
          defaultMessage: 'Alerts',
        }),
        dataType: 'number',
        render: () => {
          return '0';
        },
      },
      {
        field: 'metadata.host.os.name',
        name: i18n.translate('xpack.endpoint.host.list.os', {
          defaultMessage: 'Operating System',
        }),
      },
      {
        field: 'metadata.host.ip',
        name: i18n.translate('xpack.endpoint.host.list.ip', {
          defaultMessage: 'IP Address',
        }),
      },
      {
        field: 'metadata.agent.version',
        name: i18n.translate('xpack.endpoint.host.list.endpointVersion', {
          defaultMessage: 'Version',
        }),
      },
      {
        field: '',
        name: i18n.translate('xpack.endpoint.host.list.lastActive', {
          defaultMessage: 'Last Active',
        }),
        dataType: 'date',
        render: () => {
          return 'xxxx';
        },
      },
    ];
  }, [queryParams]);

  return (
    <HostPage>
      {hasSelectedHost && <HostDetailsFlyout />}
      <EuiPage className="hostPage">
        <EuiPageBody>
          <EuiPageHeader className="hostHeader">
            <EuiTitle size="l">
              <h1 data-test-subj="hostListTitle">
                <FormattedMessage id="xpack.endpoint.host.hosts" defaultMessage="Hosts" />
              </h1>
            </EuiTitle>
          </EuiPageHeader>

          <EuiPageContent className="hostPageContent">
            <EuiText color="subdued" size="xs">
              <FormattedMessage
                id="xpack.endpoint.host.list.totalCount"
                defaultMessage="Showing: {totalItemCount, plural, one {# Host} other {# Hosts}}"
                values={{ totalItemCount }}
              />
            </EuiText>
            <EuiHorizontalRule margin="xs" />
            <EuiBasicTable
              data-test-subj="hostListTable"
              items={useMemo(() => [...listData], [listData])}
              columns={columns}
              loading={isLoading}
              pagination={paginationSetup}
              onChange={onTableChange}
            />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </HostPage>
  );
};

const HostPage = styled.div`
  .hostPage {
    padding: 0;
  }
  .hostHeader {
    background-color: ${props => props.theme.eui.euiColorLightestShade};
    border-bottom: ${props => props.theme.eui.euiBorderThin};
    padding: ${props =>
      props.theme.eui.euiSizeXL +
      ' ' +
      0 +
      props.theme.eui.euiSizeXL +
      ' ' +
      props.theme.eui.euiSizeL};
    margin-bottom: 0;
  }
  .hostPageContent {
    border: none;
  }
`;
