/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiBasicTable } from '@elastic/eui';
import { get, sortByOrder } from 'lodash';
import React, { Component } from 'react';
import { StringMap } from '../../../../typings/common';

// TODO: this should really be imported from EUI
export interface ITableColumn {
  field: string;
  name: string;
  dataType?: string;
  align?: string;
  width?: string;
  sortable?: boolean;
  render?: (value: any, item?: any) => any;
}

export interface IManagedTableProps {
  items: Array<StringMap<any>>;
  columns: ITableColumn[];
  initialPageIndex?: number;
  initialPageSize?: number;
  hidePerPageOptions?: boolean;
  initialSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  noItemsMessage?: any;
}

export class ManagedTable extends Component<IManagedTableProps, any> {
  constructor(props: IManagedTableProps) {
    super(props);

    const defaultSort = {
      field: get(props, 'columns[0].field', ''),
      direction: 'asc'
    };

    const {
      initialPageIndex = 0,
      initialPageSize = 10,
      initialSort = defaultSort
    } = props;

    this.state = {
      page: { index: initialPageIndex, size: initialPageSize },
      sort: initialSort
    };
  }

  public onTableChange = ({ page = {}, sort = {} }) => {
    this.setState({ page, sort });
  };

  public getCurrentItems() {
    const { items } = this.props;
    const { sort = {}, page = {} } = this.state;
    // TODO: Use _.orderBy once we upgrade to lodash 4+
    const sorted = sortByOrder(items, sort.field, sort.direction);
    return sorted.slice(page.index * page.size, (page.index + 1) * page.size);
  }

  public render() {
    const {
      columns,
      noItemsMessage,
      items,
      hidePerPageOptions = true
    } = this.props;
    const { page, sort } = this.state;

    return (
      <EuiBasicTable
        noItemsMessage={noItemsMessage}
        items={this.getCurrentItems()}
        columns={columns}
        pagination={{
          hidePerPageOptions,
          totalItemCount: items.length,
          pageIndex: page.index,
          pageSize: page.size
        }}
        sorting={{ sort }}
        onChange={this.onTableChange}
      />
    );
  }
}
