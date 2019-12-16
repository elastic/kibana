/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  EuiBasicTable,
  EuiLink,
  EuiPageHeader,
  EuiPageBody,
  EuiPageHeaderSection,
  EuiTitle,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentBody,
  EuiPageContentHeaderSection,
  EuiTableCriteria,
} from '@elastic/eui';
import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { SearchBar } from './search_bar';
import {
  endpointsListData,
  isFiltered,
  filteredEndpointListData,
  totalHits,
  pageIndex as selectPageIndex,
  pageSize as selectPageSize,
  sortField as selectSortField,
  sortDirection as selectSortDirection,
} from '../selectors/endpoints_list';
import { actions } from '../actions/endpoints_list';

const EndpointName = withRouter<RouteComponentProps & { path: string; name: string }>(function({
  history,
  path,
  name,
}) {
  return <EuiLink onClick={() => history.push(path)}>{name}</EuiLink>;
});

const pageSizeOptions = [5, 10, 20];

const columns = [
  {
    field: '_source.host.hostname',
    name: 'Name',
    render: (name: string, item: { _id: string }) => {
      return <EndpointName name={name} path={`/endpoints/view/${item._id}`} />;
    },
    'data-test-subj': 'indexTableCellName',
  },
  {
    field: '_source.host.ip',
    name: 'IP Address',
    'data-test-subj': 'indexTableCellIp',
  },
  {
    field: '_source.host.os.full',
    name: 'Operating System',
    'data-test-subj': 'indexTableCellOs',
  },
  {
    field: '_source.endpoint.domain',
    name: 'Domain',
    'data-test-subj': 'indexTableCellDomain',
  },
  {
    field: '_source.host.name',
    name: 'Host Name',
    'data-test-subj': 'indexTableCellHost',
  },
];

export const EndpointsPage = () => {
  const dispatch = useDispatch();
  const endpoints = useSelector(endpointsListData);
  const showFiltered = useSelector(isFiltered);
  const filteredEndpoints = useSelector(filteredEndpointListData);
  const totalItemCount = useSelector(totalHits);
  const pageIndex = useSelector(selectPageIndex);
  const pageSize = useSelector(selectPageSize);
  const sortField = useSelector(selectSortField);
  const sortDirection = useSelector(selectSortDirection);
  const paginationSetup = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions,
    hidePerPageOptions: false,
  };
  const sortingSetup: { sort: EuiTableCriteria['sort'] } = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };
  const handleUserFilteredData = ({ updatedResult }: { updatedResult: any[] }) => {
    dispatch(
      actions.userFilteredEndpointListData({ filteredData: updatedResult, isFiltered: true })
    );
  };
  const handleTableChange = (tableState: EuiTableCriteria) => {
    let newPageIndex = tableState?.page?.index ?? pageIndex;
    const newPageSize = tableState?.page?.size ?? pageSize;
    const newSortField = (tableState?.sort?.field ?? sortField) as string;
    const newSortDirection = (tableState?.sort?.direction ?? sortDirection) as Direction;

    // If user changes page size, reset back to page 1
    if (newPageSize !== pageSize) {
      newPageIndex = 0;
    }

    // FIXME: this should really be written to the route as url params in order to maintain state on refresh
    dispatch(
      actions.userPaginatedOrSortedEndpointListTable({
        pageIndex: newPageIndex,
        pageSize: newPageSize,
        sortField: newSortField,
        sortDirection: newSortDirection,
      })
    );
  };

  return (
    <EuiPageBody>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Endpoints</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h2>Endpoint List</h2>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <SearchBar
            searchItems={endpoints as []}
            defaultFields={[`_source`]}
            updateOnChange={handleUserFilteredData}
          />
          <EuiBasicTable
            items={showFiltered ? filteredEndpoints : endpoints}
            columns={columns}
            pagination={paginationSetup}
            sorting={sortingSetup}
            onChange={handleTableChange}
          />
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
