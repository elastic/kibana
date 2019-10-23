/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  EuiPage,
  EuiButton,
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
import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { AppMountContext, AppMountParameters } from 'kibana/public';

export const AlertList = ({ context }: { context: AppMountContext }) => {
  interface AlertData {
    hits: unknown[];
    totalHits: number;
    pageIndex: number;
    pageSize: number;
    sortField?: string;
    sortDirection?: Direction;
    showPerPageOptions: boolean;
    selectedItems: object[];
  }
  const [data, setData]: [AlertData, any] = useState({
    hits: [],
    totalHits: 0,
    pageIndex: 0,
    pageSize: 10,
    showPerPageOptions: true,
    selectedItems: [],
  });

  async function fetchAlertListData() {
    const response = await context.core.http.get('/alerts', {
      query: {
        pageIndex: data.pageIndex,
        pageSize: data.pageSize,
        sortField: data.sortField,
        sortDirection: data.sortDirection,
      },
    });

    setData({
      ...data,
      hits: response.elasticsearchResponse.hits.hits,
      totalHits: response.elasticsearchResponse.hits.total.value,
    });
  }

  useEffect(() => {
    fetchAlertListData();
  }, [data.pageSize, data.pageIndex, data.sortField, data.sortDirection]);

  const onTableChange = ({ page = {}, sort = {} }: { page: any; sort: any }) => {
    const { index: pageIndex, size: pageSize } = page;
    const { field: sortField, direction: sortDirection } = sort;

    setData({
      ...data,
      pageIndex,
      pageSize,
      sortField,
      sortDirection,
    });
  };

  const onSelectionChange = selectedItems => {
    setData({
      ...data,
      selectedItems,
    });
  };

  const items = data.hits.map((item: any) => {
    return item;
  });

  const pagination = {
    pageIndex: data.pageIndex,
    pageSize: data.pageSize,
    totalItemCount: data.totalHits,
    pageSizeOptions: [5, 10, 20],
    hidePerPageOptions: !data.showPerPageOptions,
  };

  const sort: EuiTableCriteria['sort'] = {
    field: data.sortField,
    direction: data.sortDirection,
  };

  const sorting = {
    sort,
  };

  const selection = {
    selectable: () => {
      return true;
    },
    selectableMessage: () => 'Select me',
    onSelectionChange,
  };

  const renderDeleteButton = () => {
    const { selectedItems } = data;

    if (selectedItems.length === 0) {
      return;
    }

    async function onClickDelete() {
      const toArchive: string[] = selectedItems.map((item: any) => {
        return item._id;
      });

      const response = await context.core.http.post('/alerts/archive', {
        query: {
          alerts: toArchive.join(','), // TODO: seems strange that we can't use lists in query params
        },
      });

      // TODO: how to unselect once pressed?
      data.selectedItems = [];
      setData({
        ...data,
        selectedItems: [],
      });
    }

    return (
      <EuiButton color="danger" iconType="trash" onClick={onClickDelete}>
        Archive Alert
      </EuiButton>
    );
  };

  const deleteButton = renderDeleteButton();

  const columns = [
    {
      field: '_source.endgame.timestamp_utc.keyword',
      name: 'Timestamp',
      sortable: true,
      render: (_: any, item: any) => {
        return <Link to={'/alerts/' + item._id}>{item._source.endgame.timestamp_utc}</Link>;
      },
    },
    {
      field: '_source.endgame.data.alert_details.target_process.name',
      name: 'Process name',
      sortable: false,
      render: (procName: string) => {
        return procName;
      },
    },
    {
      field: '_source.host.hostname.keyword',
      name: 'Host',
      sortable: true,
      render: (_: any, item: any) => {
        return item._source.host.hostname;
      },
    },
    {
      field: '_source.host.os.name',
      name: 'Operating System',
      sortable: false,
      render: (osName: string) => {
        return osName;
      },
    },
    {
      field: '_source.host.ip',
      name: 'IP',
      sortable: false,
      render: (ip: string) => {
        return ip;
      },
    },
  ];
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
              <h2>Alert Data</h2>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          {deleteButton}
          <EuiBasicTable
            items={items}
            itemId="_id"
            columns={columns}
            pagination={pagination}
            isSelectable={true}
            sorting={sorting}
            onChange={onTableChange}
            selection={selection}
          />
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
