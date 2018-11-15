/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiBasicTable } from '@elastic/eui';

const PAGE_SIZES = [10, 25, 50];

export interface IndexDeprecation {
  index: string;
  details?: string;
}

interface IndexDeprecationTableProps {
  indices: IndexDeprecation[];
}

interface IndexDeprecationTableState {
  sortField: string;
  sortDirection: 'asc' | 'desc';
  pageIndex: number;
  pageSize: number;
}

export class IndexDeprecationTable extends React.Component<
  IndexDeprecationTableProps,
  IndexDeprecationTableState
> {
  constructor(props: IndexDeprecationTableProps) {
    super(props);

    this.state = {
      sortField: 'index',
      sortDirection: 'asc',
      pageIndex: 0,
      pageSize: 10,
    };
  }

  public render() {
    const { indices } = this.props;
    const { pageIndex, pageSize, sortField, sortDirection } = this.state;

    const columns = [
      { field: 'index', name: 'Index', sortable: true },
      { field: 'details', name: 'Details' },
    ];

    const totalItemCount = indices.length;

    const sorting = { sort: { field: sortField, direction: sortDirection } };
    const pagination = {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: PAGE_SIZES,
    };

    return (
      <EuiBasicTable
        items={this.getRows()}
        columns={columns}
        sorting={sorting}
        pagination={pagination}
        onChange={this.onTableChange}
      />
    );
  }

  private getRows() {
    const { sortField, sortDirection, pageIndex, pageSize } = this.state;
    const { indices } = this.props;

    let sorted = _.sortBy(indices, sortField);
    if (sortDirection === 'desc') {
      sorted = sorted.reverse();
    }

    const start = pageIndex * pageSize;
    return sorted.slice(start, start + pageSize);
  }

  private onTableChange = (tableProps: any) => {
    this.setState({
      sortField: tableProps.sort.field,
      sortDirection: tableProps.sort.direction,
      pageIndex: tableProps.page.index,
      pageSize: tableProps.page.size,
    });
  };
}
