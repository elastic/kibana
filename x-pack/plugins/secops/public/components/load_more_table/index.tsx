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

import { LoadingPanel } from '../loading';
import * as i18n from './translations';

export interface ItemsPerRow {
  text: string;
  numberOfRow: number;
}

interface BasicTableProps<T> {
  // tslint:disable-next-line:no-any
  pageOfItems: any[];
  columns: Array<Columns<T>>;
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
  isEmptyTable: boolean;
  isPopoverOpen: boolean;
  paginationLoading: boolean;
}

export interface Columns<T> {
  field?: string;
  name: string;
  isMobileHeader?: boolean;
  sortable?: boolean;
  truncateText?: boolean;
  hideForMobile?: boolean;
  render?: (item: T) => void;
}

export class LoadMoreTable<T> extends React.PureComponent<BasicTableProps<T>, BasicTableState> {
  public readonly state = {
    isEmptyTable: this.props.pageOfItems.length === 0,
    isPopoverOpen: false,
    paginationLoading: false,
  };

  public componentDidUpdate(prevProps: BasicTableProps<T>) {
    const { paginationLoading, isEmptyTable } = this.state;
    const { loading, pageOfItems } = this.props;
    if (paginationLoading && prevProps.loading && !loading) {
      this.setState({
        ...this.state,
        paginationLoading: false,
      });
    }
    if (isEmpty(prevProps.pageOfItems) && !isEmpty(pageOfItems) && isEmptyTable) {
      this.setState({
        ...this.state,
        isEmptyTable: false,
      });
    }
  }

  public render() {
    const {
      columns,
      hasNextPage,
      itemsPerRow,
      loading,
      loadingTitle,
      pageOfItems,
      title,
      limit,
      updateLimitPagination,
    } = this.props;
    const { isEmptyTable, paginationLoading } = this.state;

    if (loading && isEmptyTable) {
      return (
        <LoadingPanel
          height="auto"
          width="100%"
          text={`${i18n.LOADING} ${loadingTitle ? loadingTitle : title}`}
          data-test-subj="InitialLoadingPanelLoadMoreTable"
        />
      );
    }

    const button = (
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.onButtonClick}
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
        {!paginationLoading && loading && (
          <>
            <BackgroundRefetch />
            <LoadingPanel
              height="100%"
              width="100%"
              text={`${i18n.LOADING} ${loadingTitle ? loadingTitle : title}`}
              position="absolute"
              zIndex={3}
              data-test-subj="LoadingPanelLoadMoreTable"
            />
          </>
        )}
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
                    data-test-subj="loadingMoreSizeRowPopover"
                    button={button}
                    isOpen={this.state.isPopoverOpen}
                    closePopover={this.closePopover}
                    panelPaddingSize="none"
                  >
                    <EuiContextMenuPanel items={rowItems} data-test-subj="loadingMorePickSizeRow" />
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
                    <EuiButton
                      data-test-subj="loadingMoreButton"
                      isLoading={loading}
                      onClick={this.loadMore}
                    >
                      {loading ? `${i18n.LOADING}...` : i18n.LOAD_MORE}
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

  private loadMore = () => {
    this.setState({
      ...this.state,
      paginationLoading: true,
    });
    this.props.loadMore();
  };

  private onButtonClick = () => {
    this.setState({
      ...this.state,
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  private closePopover = () => {
    this.setState({
      ...this.state,
      isPopoverOpen: false,
    });
  };
}

export const BasicTableContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  height: auto;
  position: relative;
`;

const FooterAction = styled.div`
  margin-top: 0.5rem;
  width: 100%;
`;

const BackgroundRefetch = styled.div`
  background-color: ${props => props.theme.eui.euiColorLightShade};
  margin: -5px;
  height: calc(100% + 10px);
  opacity: 0.7;
  width: calc(100% + 10px);
  position: absolute;
  z-index: 3;
  border-radius: 5px;
`;
