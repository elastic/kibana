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
  EuiPanel,
  EuiPopover,
} from '@elastic/eui';
import { isEmpty, noop, getOr } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { Direction } from '../../graphql/types';
import { HeaderPanel } from '../header_panel';
import { LoadingPanel } from '../loading';

import * as i18n from './translations';

export interface ItemsPerRow {
  text: string;
  numberOfRow: number;
}

export interface SortingBasicTable {
  field: string;
  direction: Direction;
  allowNeutralSort?: boolean;
}

export interface Criteria {
  page?: { index: number; size: number };
  sort?: SortingBasicTable;
}

// Using telescoping templates to remove 'any' that was polluting downstream column type checks
interface BasicTableProps<T, U = T, V = T, W = T, X = T, Y = T, Z = T, AA = T, AB = T> {
  columns:
    | [Columns<T>]
    | [Columns<T>, Columns<U>]
    | [Columns<T>, Columns<U>, Columns<V>]
    | [Columns<T>, Columns<U>, Columns<V>, Columns<W>]
    | [Columns<T>, Columns<U>, Columns<V>, Columns<W>, Columns<X>]
    | [Columns<T>, Columns<U>, Columns<V>, Columns<W>, Columns<X>, Columns<Y>]
    | [Columns<T>, Columns<U>, Columns<V>, Columns<W>, Columns<X>, Columns<Y>, Columns<Z>]
    | [
        Columns<T>,
        Columns<U>,
        Columns<V>,
        Columns<W>,
        Columns<X>,
        Columns<Y>,
        Columns<Z>,
        Columns<AA>
      ]
    | [
        Columns<T>,
        Columns<U>,
        Columns<V>,
        Columns<W>,
        Columns<X>,
        Columns<Y>,
        Columns<Z>,
        Columns<AA>,
        Columns<AB>
      ];
  hasNextPage: boolean;
  headerCount: number;
  headerSupplement?: React.ReactElement;
  headerTitle: string | React.ReactElement;
  headerTooltip?: string;
  headerUnit: string | React.ReactElement;
  itemsPerRow?: ItemsPerRow[];
  limit: number;
  loading: boolean;
  loadingTitle?: string;
  loadMore: () => void;
  onChange?: (criteria: Criteria) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pageOfItems: any[];
  sorting?: SortingBasicTable;
  updateLimitPagination: (limit: number) => void;
}

interface BasicTableState {
  isEmptyTable: boolean;
  isPopoverOpen: boolean;
  paginationLoading: boolean;
}

export interface Columns<T> {
  field?: string;
  name: string | React.ReactNode;
  isMobileHeader?: boolean;
  sortable?: boolean;
  truncateText?: boolean;
  hideForMobile?: boolean;
  render?: (item: T) => void;
}

export class LoadMoreTable<T, U, V, W, X, Y, Z, AA, AB> extends React.PureComponent<
  BasicTableProps<T, U, V, W, X, Y, Z, AA, AB>,
  BasicTableState
> {
  public readonly state = {
    isEmptyTable: this.props.pageOfItems.length === 0,
    isPopoverOpen: false,
    paginationLoading: false,
  };

  static getDerivedStateFromProps<T, U, V, W, X, Y, Z, AA, AB>(
    props: BasicTableProps<T, U, V, W, X, Y, Z, AA, AB>,
    state: BasicTableState
  ) {
    if (state.isEmptyTable && !isEmpty(props.pageOfItems)) {
      return {
        ...state,
        isEmptyTable: false,
      };
    }
    return null;
  }

  public render() {
    const {
      columns,
      hasNextPage,
      headerCount,
      headerSupplement,
      headerTitle,
      headerTooltip,
      headerUnit,
      itemsPerRow,
      limit,
      loading,
      loadingTitle,
      onChange = noop,
      pageOfItems,
      sorting = null,
      updateLimitPagination,
    } = this.props;
    const { isEmptyTable } = this.state;

    if (loading && isEmptyTable) {
      return (
        <EuiPanel>
          <LoadingPanel
            height="auto"
            width="100%"
            text={`${i18n.LOADING} ${loadingTitle ? loadingTitle : headerTitle}`}
            data-test-subj="InitialLoadingPanelLoadMoreTable"
          />
        </EuiPanel>
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
      <EuiPanel>
        <BasicTableContainer>
          {loading && (
            <>
              <BackgroundRefetch />
              <LoadingPanel
                height="100%"
                width="100%"
                text={`${i18n.LOADING} ${loadingTitle ? loadingTitle : headerTitle}`}
                position="absolute"
                zIndex={3}
                data-test-subj="LoadingPanelLoadMoreTable"
              />
            </>
          )}

          <HeaderPanel
            subtitle={`${i18n.SHOWING}: ${headerCount.toLocaleString()} ${headerUnit}`}
            title={headerTitle}
            tooltip={headerTooltip}
          >
            {headerSupplement}
          </HeaderPanel>

          <BasicTable
            items={pageOfItems}
            columns={columns}
            onChange={onChange}
            sorting={
              sorting
                ? {
                    sort: {
                      field: sorting.field,
                      direction: sorting.direction,
                    },
                  }
                : null
            }
          />

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
                      <EuiContextMenuPanel
                        items={rowItems}
                        data-test-subj="loadingMorePickSizeRow"
                      />
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
                        onClick={this.props.loadMore}
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
      </EuiPanel>
    );
  }

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

/*
 *   The getOr is just there to simplify the test
 *   So we do NOT need to wrap it around TestProvider
 */
const BackgroundRefetch = styled.div`
  background-color: ${props => getOr('#ffffff', 'theme.eui.euiColorLightShade', props)};
  margin: -5px;
  height: calc(100% + 10px);
  opacity: 0.7;
  width: calc(100% + 10px);
  position: absolute;
  z-index: 3;
  border-radius: 5px;
`;

const BasicTable = styled(EuiBasicTable)`
  tbody {
    th,
    td {
      vertical-align: top;
    }
  }
`;
