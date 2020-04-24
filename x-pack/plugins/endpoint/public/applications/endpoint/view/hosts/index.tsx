/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback, memo } from 'react';
import { EuiHorizontalRule, EuiBasicTable, EuiText, EuiLink, EuiHealth } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { createStructuredSelector } from 'reselect';
import { EuiBasicTableColumn } from '@elastic/eui';
import { HostDetailsFlyout } from './details';
import * as selectors from '../../store/hosts/selectors';
import { useHostSelector } from './hooks';
import { CreateStructuredSelector } from '../../types';
import { urlFromQueryParams } from './url_from_query_params';
import { HostMetadata, Immutable } from '../../../../../common/types';
import { PageView } from '../components/page_view';
import { useNavigateByRouterEventHandler } from '../hooks/use_navigate_by_router_event_handler';

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
      history.push(
        urlFromQueryParams({
          ...queryParams,
          page_index: JSON.stringify(index),
          page_size: JSON.stringify(size),
        })
      );
    },
    [history, queryParams]
  );

  const columns: Array<EuiBasicTableColumn<Immutable<HostMetadata>>> = useMemo(() => {
    return [
      {
        field: '',
        name: i18n.translate('xpack.endpoint.host.list.hostname', {
          defaultMessage: 'Hostname',
        }),
        render: ({ host: { hostname, id } }: { host: { hostname: string; id: string } }) => {
          const newQueryParams = urlFromQueryParams({ ...queryParams, selected_host: id });
          return (
            <HostLink name={hostname} href={'?' + newQueryParams.search} route={newQueryParams} />
          );
        },
      },
      {
        field: '',
        name: i18n.translate('xpack.endpoint.host.list.policy', {
          defaultMessage: 'Policy',
        }),
        truncateText: true,
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
        field: 'host.os.name',
        name: i18n.translate('xpack.endpoint.host.list.os', {
          defaultMessage: 'Operating System',
        }),
      },
      {
        field: 'host.ip',
        name: i18n.translate('xpack.endpoint.host.list.ip', {
          defaultMessage: 'IP Address',
        }),
        truncateText: true,
      },
      {
        field: '',
        name: i18n.translate('xpack.endpoint.host.list.sensorVersion', {
          defaultMessage: 'Sensor Version',
        }),
        render: () => {
          return 'version';
        },
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
    <PageView
      viewType="list"
      data-test-subj="hostPage"
      headerLeft={i18n.translate('xpack.endpoint.host.hosts', { defaultMessage: 'Hosts' })}
    >
      {hasSelectedHost && <HostDetailsFlyout />}
      <EuiText color="subdued" size="xs">
        <FormattedMessage
          id="xpack.endpoint.host.list.totalCount"
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
    </PageView>
  );
};
