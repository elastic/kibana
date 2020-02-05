/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiBasicTable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  endpointListData,
  endpointListPageIndex,
  endpointListPageSize,
  endpointTotalHits,
  isLoading,
} from '../../store/endpoint_list/selectors';
import { EndpointListAction } from '../../store/endpoint_list/action';
import { useEndpointListSelector } from './hooks';
import { usePageId } from '../use_page_id';

export const EndpointList = () => {
  usePageId('managementPage');
  const dispatch = useDispatch<(a: EndpointListAction) => void>();
  const endpointListResults = useEndpointListSelector(endpointListData);
  const pageIndex = useEndpointListSelector(endpointListPageIndex);
  const pageSize = useEndpointListSelector(endpointListPageSize);
  const totalItemCount = useEndpointListSelector(endpointTotalHits);
  const loading = useEndpointListSelector(isLoading);

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
        type: 'userPaginatedEndpointListTable',
        payload: { pageIndex: index, pageSize: size },
      });
    },
    [dispatch]
  );

  const columns = [
    {
      field: 'host.hostname',
      name: i18n.translate('xpack.endpoint.management.list.host', {
        defaultMessage: 'Hostname',
      }),
    },
    {
      field: 'endpoint.policy.name',
      name: i18n.translate('xpack.endpoint.management.list.policy', {
        defaultMessage: 'Policy',
      }),
    },
    {
      field: 'host.hostname',
      name: i18n.translate('xpack.endpoint.management.list.policyStatus', {
        defaultMessage: 'Policy Status',
      }),
      render: () => {
        return <span>Policy Status</span>;
      },
    },
    {
      field: 'endpoint',
      name: i18n.translate('xpack.endpoint.management.list.alerts', {
        defaultMessage: 'Alerts',
      }),
      render: () => {
        return <span>0</span>;
      },
    },
    {
      field: 'host.os.name',
      name: i18n.translate('xpack.endpoint.management.list.os', {
        defaultMessage: 'Operating System',
      }),
    },
    {
      field: 'host.ip',
      name: i18n.translate('xpack.endpoint.management.list.ip', {
        defaultMessage: 'IP Address',
      }),
    },
    {
      field: 'endpoint.sensor',
      name: i18n.translate('xpack.endpoint.management.list.sensorVersion', {
        defaultMessage: 'Sensor Version',
      }),
      render: () => {
        return <span>version</span>;
      },
    },
    {
      field: 'host.hostname',
      name: i18n.translate('xpack.endpoint.management.list.lastActive', {
        defaultMessage: 'Last Active',
      }),
      render: () => {
        return <span>xxxx</span>;
      },
    },
  ];

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="xs">
              <h1>Endpoints</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle>
                <h2 data-test-subj="managementViewTitle">
                  <FormattedMessage
                    id="xpack.endpoint.management.list.hosts"
                    defaultMessage="Hosts"
                  />
                </h2>
              </EuiTitle>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiBasicTable
            data-test-subj="managementListTable"
            items={endpointListResults}
            columns={columns}
            loading={loading}
            pagination={paginationSetup}
            onChange={onTableChange}
          />
          <EuiPageContentBody />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
