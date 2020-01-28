/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
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
import { useEndpointListSelector } from '../store/hooks';
import {
  endpointListData,
  endpointListPageIndex,
  endpointListPageSize,
  endpointTotalHits,
} from '../store/endpoint_list/selectors';
import { EndpointListAction } from '../store/endpoint_list/action';

export const EndpointList = () => {
  const dispatch = useDispatch<(a: EndpointListAction) => void>();
  const endpointListResults = useEndpointListSelector(endpointListData);
  const pageIndex = useEndpointListSelector(endpointListPageIndex);
  const pageSize = useEndpointListSelector(endpointListPageSize);
  const totalItemCount = useEndpointListSelector(endpointTotalHits);

  const paginationSetup = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

  const onTableChange = ({ page }: { page: { index: number; size: number } }) => {
    const { index, size } = page;
    dispatch({
      type: 'userPaginatedEndpointListTable',
      payload: { pageIndex: index, pageSize: size },
    });
  };

  const columns = [
    {
      field: 'host.hostname',
      name: 'Host',
    },
    {
      field: 'host.os.name',
      name: 'Operating System',
    },
    {
      field: 'endpoint.policy.name',
      name: 'Policy',
    },
    {
      field: 'host.hostname',
      name: 'Policy Status',
      render: () => {
        return <span>Policy Status</span>;
      },
    },
    {
      field: 'endpoint',
      name: 'Alerts',
      render: () => {
        return <span>0</span>;
      },
    },
    {
      field: 'endpoint.domain',
      name: 'Domain',
    },
    {
      field: 'host.ip',
      name: 'IP Address',
    },
    {
      field: 'endpoint.sensor',
      name: 'Sensor Version',
      render: () => {
        return <span>version</span>;
      },
    },
    {
      field: 'host.hostname',
      name: 'Last Active',
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
                <h2>Hosts</h2>
              </EuiTitle>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiBasicTable
            items={endpointListResults}
            columns={columns}
            pagination={paginationSetup}
            onChange={onTableChange}
          />
          <EuiPageContentBody />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
