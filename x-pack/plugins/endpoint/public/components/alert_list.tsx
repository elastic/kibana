/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  EuiButton,
  EuiBasicTable,
  EuiTableCriteria,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import * as alertListSelectors from '../selectors/alert_list';
import { actions as alertListActions } from '../actions/alert_list';

export const AlertList = () => {
  const dispatch = useDispatch();
  const alertListData = useSelector(alertListSelectors.alertListData);
  const totalHits = useSelector(alertListSelectors.totalHits);
  const pageIndex = useSelector(alertListSelectors.pageIndex);
  const pageSize = useSelector(alertListSelectors.pageSize);
  const showPerPageOptions = useSelector(alertListSelectors.showPerPageOptions);
  const sortField = useSelector(alertListSelectors.sortField);
  const sortDirection = useSelector(alertListSelectors.sortDirection);
  const selectedItems = useSelector(alertListSelectors.selectedItems);

  const onTableChange = ({ page = {}, sort = {} }: { page: any; sort: any }) => {
    const { index = pageIndex, size = pageSize } = page;
    const { field = sortField, direction = sortDirection } = sort;
    dispatch(
      alertListActions.userPaginatedOrSortedTable({
        pageIndex: index,
        pageSize: size,
        sortField: field,
        sortDirection: direction,
      })
    );
  };

  const items = alertListData.hits.map((item: any) => {
    return {
      _id: item._id,
      ...item._source,
    };
  });

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: totalHits,
    pageSizeOptions: [5, 10, 20],
    hidePerPageOptions: !showPerPageOptions,
  };

  const sort: EuiTableCriteria['sort'] = {
    field: sortField,
    direction: sortDirection,
  };

  const sorting = {
    sort,
  };

  const onSelectionChange = function(itemsSelected: object[]) {
    dispatch(alertListActions.userSelectedTableItems(itemsSelected));
  };

  const selection = {
    selectable: () => {
      return true;
    },
    selectableMessage: () => 'Select me',
    onSelectionChange,
  };

  const renderDeleteButton = () => {
    if (selectedItems.length === 0) {
      return;
    }

    async function onArchive() {
      const idsToArchive: string[] = selectedItems.map((item: any) => {
        return item._id;
      });
      dispatch(alertListActions.userClickedArchiveItems(idsToArchive));
      // TODO: how to unselect once pressed? See https://github.com/elastic/eui/issues/1077
    }

    return (
      <EuiButton color="danger" iconType="trash" onClick={onArchive}>
        Archive Alert
      </EuiButton>
    );
  };

  const deleteButton = renderDeleteButton();

  const columns = [
    {
      field: 'endgame.timestamp_utc.keyword',
      name: 'Timestamp',
      sortable: true,
      render: (_: any, item: any) => {
        return <Link to={'/alerts/' + item._id}>{item.endgame.timestamp_utc}</Link>;
      },
    },
    {
      field: 'endgame.data.alert_details.target_process.name',
      name: 'Process name',
      sortable: false,
      render: (procName: string) => {
        return procName;
      },
    },
    {
      field: 'host.hostname.keyword',
      name: 'Host',
      sortable: true,
      render: (_: any, item: any) => {
        return item.host.hostname;
      },
    },
    {
      field: 'host.os.name',
      name: 'Operating System',
      sortable: false,
      render: (osName: string) => {
        return osName;
      },
    },
    {
      field: 'host.ip',
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
