/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiButton, EuiTitle } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { EventItem } from '../../../common/graphql/types';
import { LoadingPanel } from '../loading';

export interface HoryzontalBarChartData {
  x: number;
  y: string;
}

interface BasicTableProps {
  // tslint:disable-next-line:no-any
  pageOfItems: any[];
  columns: Columns[];
  title: string | React.ReactNode;
  loading: boolean;
  loadingTitle?: string;
  hasNextPage: boolean;
  loadMore: () => void;
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

export const LoadMoreTable = pure<BasicTableProps>(
  ({ columns, hasNextPage, loading, loadingTitle, pageOfItems, title, loadMore }) => {
    if (loading && isEmpty(pageOfItems)) {
      return (
        <LoadingPanel
          height="auto"
          width="100%"
          text={`Loading ${loadingTitle ? loadingTitle : title}`}
        />
      );
    }

    return (
      <BasicTableContainer>
        <EuiTitle size="s">{title}</EuiTitle>
        <EuiBasicTable items={pageOfItems} columns={columns} />
        {hasNextPage && (
          <EuiButton isLoading={loading} onClick={loadMore}>
            {loading ? 'Loading...' : 'Load More'}
          </EuiButton>
        )}
      </BasicTableContainer>
    );
  }
);

export const BasicTableContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  height: auto;
`;
