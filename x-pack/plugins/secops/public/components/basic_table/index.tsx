/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiTitle } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { EventItem } from '../../../common/graphql/types';
import { LoadingPanel } from '../loading';

export interface HoryzontalBarChartData {
  x: number;
  y: string;
}

interface BasicTableProps {
  sortField: string;
  // tslint:disable-next-line:no-any
  pageOfItems: any[];
  columns: Columns[];
  title: string;
  loading: boolean;
}

interface BasicTableState {
  pageIndex: number;
  pageSize: number;
  sortField: string;
  sortDirection: string;
}

export interface Columns {
  field?: string;
  name: string;
  isMobileHeader?: boolean;
  sortable?: boolean;
  truncateText?: boolean;
  hideForMobile?: boolean;
  render?: (item: EventItem) => void;
}

interface Page {
  index: number;
  size: number;
}

interface Sort {
  field: string;
  direction: string;
}

interface TableChange {
  page: Page;
  sort: Sort;
}

export class BasicTable extends React.PureComponent<BasicTableProps, BasicTableState> {
  public readonly state = {
    pageIndex: 0,
    pageSize: 3,
    sortField: this.props.sortField,
    sortDirection: 'asc',
  };

  public render() {
    const { pageIndex, pageSize, sortField, sortDirection } = this.state;
    const { columns, title, loading } = this.props;

    if (loading) {
      return <LoadingPanel height="100%" width="100%" text={`Loading ${title}`} />;
    }

    const pagination = {
      pageIndex,
      pageSize,
      totalItemCount: this.props.pageOfItems.length,
      pageSizeOptions: [3, 5, 8],
      hidePerPageOptions: false,
    };

    const sorting = {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };

    return (
      <BasicTableContainer>
        <EuiTitle size="s">
          <h3>{title}</h3>
        </EuiTitle>
        <EuiBasicTable
          items={this.getCurrentItems()}
          columns={columns}
          pagination={pagination}
          sorting={sorting}
          onChange={this.onTableChange}
        />
      </BasicTableContainer>
    );
  }

  private getCurrentItems = () => {
    const { pageOfItems } = this.props;
    const { pageIndex, pageSize } = this.state;
    return pageOfItems.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  };

  private onTableChange = ({ page, sort }: TableChange) => {
    const { index: pageIndex, size: pageSize } = page;
    const { field: sortField, direction: sortDirection } = sort;

    this.setState({
      pageIndex,
      pageSize,
      sortField,
      sortDirection,
    });
  };
}

export const BasicTableContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  height: 100%;
`;
