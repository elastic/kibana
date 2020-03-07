/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
  EuiBasicTable,
  EuiTextColor,
  EuiLink,
  EuiHealth,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { createStructuredSelector } from 'reselect';
import { HostDetailsFlyout } from './details';
import * as selectors from '../../store/hosts/selectors';
import { HostAction } from '../../store/hosts/action';
import { useHostListSelector } from './hooks';
import { CreateStructuredSelector } from '../../types';
import { urlFromQueryParams } from './url_from_query_params';

const selector = (createStructuredSelector as CreateStructuredSelector)(selectors);
export const HostList = () => {
  const dispatch = useDispatch<(a: HostAction) => void>();
  const history = useHistory();
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

  const columns = useMemo(() => {
    return [
      {
        field: '',
        name: i18n.translate('xpack.endpoint.host.list.hostname', {
          defaultMessage: 'Hostname',
        }),
        render: ({ host: { hostname, id } }: { host: { hostname: string; id: string } }) => {
          return (
            // eslint-disable-next-line @elastic/eui/href-or-on-click
            <EuiLink
              data-test-subj="hostnameCellLink"
              href={'?' + urlFromQueryParams({ ...queryParams, selected_host: id }).search}
              onClick={(ev: React.MouseEvent) => {
                ev.preventDefault();
                history.push(urlFromQueryParams({ ...queryParams, selected_host: id }));
              }}
            >
              {hostname}
            </EuiLink>
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
        render: () => {
          return 'xxxx';
        },
      },
    ];
  }, [queryParams, history]);

  return (
    <>
      {hasSelectedHost && <HostDetailsFlyout />}
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                <EuiTitle>
                  <h2 data-test-subj="hostListTitle">
                    <FormattedMessage id="xpack.endpoint.host.hosts" defaultMessage="Hosts" />
                  </h2>
                </EuiTitle>
                <h4>
                  <EuiTextColor color="subdued">
                    {totalItemCount === 1 ? (
                      <FormattedMessage
                        id="xpack.endpoint.host.list.totalCount"
                        defaultMessage="{totalItemCount} Host"
                        values={{ totalItemCount }}
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.endpoint.host.list.totalCounts"
                        defaultMessage="{totalItemCount} Hosts"
                        values={{ totalItemCount }}
                      />
                    )}
                  </EuiTextColor>
                </h4>
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>
            <EuiPageContentBody>
              <EuiBasicTable
                data-test-subj="hostListTable"
                items={listData}
                columns={columns}
                loading={isLoading}
                pagination={paginationSetup}
                onChange={onTableChange}
              />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </>
  );
};
