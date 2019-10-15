/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';

import {
  EuiPage,
  EuiBasicTable,
  EuiLink,
  EuiHealth,
  EuiTableCriteria,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageSideBar,
  EuiTitle,
  EuiSideNav,
} from '@elastic/eui';
import { AppMountContext, AppMountParameters } from 'kibana/public';
import { number } from 'joi';

export const AlertList = ({ context }: { context: AppMountContext }) => {
  const [data, setData] = useState({ hits: [], pageIndex: 0, pageSize: 5, sortField: '', sortDirection: 'asc'});

  async function fetchAlertListData() {
    const response = await context.core.http.get('/alerts', {
      query: {},
    });
    setData({
      hits: response.elasticsearchResponse.hits.hits,
      pageIndex: data.pageIndex,
      pageSize: data.pageSize,
      sortField: data.sortField,
      sortDirection: data.sortDirection
    });
  }

  const onTableChange = ({ page = {}, sort = {} }: {page: any, sort: any}) => {
    const { index: pageIndex, size: pageSize } = page;

    const { field: sortField, direction: sortDirection } = sort;

    setData({
      hits: data.hits,
      pageIndex,
      pageSize,
      sortField,
      sortDirection,
    });
  };


  useEffect(() => {
    fetchAlertListData();
  }, [data.pageIndex, data.sortDirection, data.sortField]);


  const items = data.hits.map((item: any) => {
    return item._source})

  const sort: EuiTableCriteria['sort'] = {
      field: 'endgame.timestamp_utc',
      direction: 'asc',
  };

  const sorting = {
    sort: sort
  }


  const columns = [
    {
      field: 'endgame.timestamp_utc',
      name: 'Timestamp',
      sortable: true,
      render: (timestamp: string) => {return timestamp}
    },
    {
      field: 'endgame.data.alert_details.target_process.name',
      name: 'Process name',
      sortable: false,
      render: (procName: string) => {return procName}
    },
    {
      field: 'host.hostname',
      name: 'Host',
      sortable: false,
      render: (hostName: string) => {return hostName}
    },
    {
      field: 'host.os.name',
      name: 'Operating System',
      sortable: false,
      render: (osName: string) => {return osName}
    },
    {
      field: 'host.ip',
      name: 'IP',
      sortable: false,
      render: (ip: string) => {return ip}
    },
  ]
  return (
    <EuiPageBody data-test-subj="fooAppPageA">
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Alerts</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h2>Alert timestamps</h2>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>

        <EuiBasicTable
          items={items}
          columns={columns}
          sorting={sorting}
          onChange={onTableChange}
        />
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
