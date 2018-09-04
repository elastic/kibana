/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiBasicTable } from '@elastic/eui';
import get from 'lodash.get';
import orderBy from 'lodash.orderby';
import React, { Component } from 'react';

// TODO: this should really be imported from EUI
interface TableColumn {
  field: string;
  name: string;
  width?: string;
  sortable?: boolean;
  render: (value: any, item?: any) => any;
}

interface ManagedTableProps {
  items: Array<StringMap<any>>;
  initialSort?: {
    field: string;
    direction: string;
  };
  noItemsMessage?: any;
  columns: TableColumn[];
}

export class ManagedTable extends Component<ManagedTableProps, any> {
  constructor(props: ManagedTableProps) {
    super(props);

    const defaultSort = {
      field: get(props, 'columns[0].field', ''),
      direction: 'asc'
    };

    this.state = {
      page: { index: 0, size: 10 },
      sort: props.initialSort || defaultSort
    };
  }

  public onTableChange = ({ page = {}, sort = {} }) => {
    this.setState({ page, sort });
  };

  public getCurrentItems() {
    const { items } = this.props;
    const { sort = {}, page = {} } = this.state;
    const sorted = orderBy(items, sort.field, sort.direction);
    return sorted.slice(page.index * page.size, (page.index + 1) * page.size);
  }

  public render() {
    const { columns, noItemsMessage, items } = this.props;
    const { page, sort } = this.state;
    return (
      <EuiBasicTable
        noItemsMessage={noItemsMessage}
        items={this.getCurrentItems()}
        columns={columns}
        pagination={{
          hidePerPageOptions: true,
          pageIndex: page.index,
          pageSize: page.size,
          totalItemCount: items.length
        }}
        sorting={{ sort }}
        onChange={this.onTableChange}
      />
    );
  }
}
