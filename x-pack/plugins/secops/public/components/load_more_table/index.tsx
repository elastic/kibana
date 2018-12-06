/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTitle,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { EventItem } from '../../../common/graphql/types';
import { LoadingPanel } from '../loading';

export interface HoryzontalBarChartData {
  x: number;
  y: string;
}

export interface ItemsPerRow {
  text: string;
  numberOfRow: number;
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
  updateLimitPagination: (limit: number) => void;
  itemsPerRow?: ItemsPerRow[];
  limit: number;
}

interface BasicTableState {
  isPopoverOpen: boolean;
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

export class LoadMoreTable extends React.PureComponent<BasicTableProps, BasicTableState> {
  public readonly state = {
    isPopoverOpen: false,
  };

  public render() {
    const {
      columns,
      hasNextPage,
      itemsPerRow,
      loading,
      loadingTitle,
      pageOfItems,
      title,
      loadMore,
      limit,
      updateLimitPagination,
    } = this.props;

    if (loading && isEmpty(pageOfItems)) {
      return (
        <LoadingPanel
          height="auto"
          width="100%"
          text={`Loading ${loadingTitle ? loadingTitle : title}`}
        />
      );
    }

    const button = (
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.onButtonClick.bind(this)}
      >
        Rows: {limit}
      </EuiButtonEmpty>
    );

    const rowItems =
      itemsPerRow &&
      itemsPerRow.map(item => (
        <EuiContextMenuItem
          key={item.text}
          icon={limit === item.numberOfRow ? 'check' : 'empty'}
          onClick={() => {
            this.closePopover();
            updateLimitPagination(item.numberOfRow);
          }}
        >
          {item.text}
        </EuiContextMenuItem>
      ));

    return (
      <BasicTableContainer>
        <EuiTitle size="s">{title}</EuiTitle>
        <EuiBasicTable items={pageOfItems} columns={columns} />
        {hasNextPage && (
          <FooterAction>
            <EuiFlexGroup
              gutterSize="none"
              alignItems="flexStart"
              justifyContent="flexStart"
              direction="row"
            >
              <EuiFlexItem grow={false}>
                {!isEmpty(itemsPerRow) && (
                  <EuiPopover
                    id="customizablePagination"
                    button={button}
                    isOpen={this.state.isPopoverOpen}
                    closePopover={this.closePopover.bind(this)}
                    panelPaddingSize="none"
                  >
                    <EuiContextMenuPanel items={rowItems} />
                  </EuiPopover>
                )}
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup
                  gutterSize="none"
                  alignItems="flexStart"
                  justifyContent="center"
                  direction="row"
                >
                  <EuiFlexItem grow={false}>
                    <EuiButton isLoading={loading} onClick={loadMore}>
                      {loading ? 'Loading...' : 'Load More'}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </FooterAction>
        )}
      </BasicTableContainer>
    );
  }

  private onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  private closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };
}

export const BasicTableContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  height: auto;
`;

const FooterAction = styled.div`
  margin-top: 0.5rem;
  width: 100%;
`;
