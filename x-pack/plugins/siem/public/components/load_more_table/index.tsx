/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiPanel,
  EuiPopover,
  EuiTitle,
} from '@elastic/eui';
import { isEmpty, noop, getOr } from 'lodash/fp';
import React, { memo, useState, useEffect } from 'react';
import styled from 'styled-components';

import { Direction } from '../../graphql/types';
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

interface BasicTableProps<T> {
  columns: Array<Columns<T>>;
  limit: number;
  loading: boolean;
  loadingTitle?: string;
  loadMore: (activePage: number) => void;
  itemsPerRow?: ItemsPerRow[];
  onChange?: (criteria: Criteria) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pageOfItems: any[];
  sorting?: SortingBasicTable;
  totalCount: number;
  title: string | React.ReactElement;
  updateActivePage: (activePage: number) => void;
  updateLimitPagination: (limit: number) => void;
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

export const LoadMoreTable = memo<BasicTableProps<any>>(
  ({
    columns,
    itemsPerRow,
    limit,
    loading,
    loadingTitle,
    loadMore,
    onChange = noop,
    pageOfItems,
    sorting = null,
    totalCount,
    title,
    updateActivePage,
    updateLimitPagination,
  }) => {
    const [activePage, setActivePage] = useState(0);
    const [isEmptyTable, setEmptyTable] = useState(pageOfItems.length === 0);
    const [isPopoverOpen, setPopoverOpen] = useState(false);
    const pageCount = Math.ceil(totalCount / limit);

    useEffect(
      () => {
        return setActivePage(0);
      },
      [limit]
    );

    const onButtonClick = () => {
      setPopoverOpen(!isPopoverOpen);
    };

    const closePopover = () => {
      setPopoverOpen(false);
    };

    const goToPage = (newActivePage: number) => {
      setActivePage(newActivePage);
      loadMore(newActivePage);
      updateActivePage(newActivePage);
    };
    if (!isEmpty(pageOfItems) && isEmptyTable) {
      setEmptyTable(false);
    }
    if (loading && isEmptyTable) {
      return (
        <EuiPanel>
          <LoadingPanel
            height="auto"
            width="100%"
            text={`${i18n.LOADING} ${loadingTitle ? loadingTitle : title}`}
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
        onClick={onButtonClick}
      >
        Rows: {limit}
      </EuiButtonEmpty>
    );

    const rowItems =
      itemsPerRow &&
      itemsPerRow.map((item: ItemsPerRow) => (
        <EuiContextMenuItem
          key={item.text}
          icon={limit === item.numberOfRow ? 'check' : 'empty'}
          onClick={() => {
            closePopover();
            updateLimitPagination(item.numberOfRow);
            updateActivePage(0); // reset results to first page
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
                text={`${i18n.LOADING} ${loadingTitle ? loadingTitle : title}`}
                position="absolute"
                zIndex={3}
                data-test-subj="LoadingPanelLoadMoreTable"
              />
            </>
          )}
          <EuiTitle size="s">
            <>{title}</>
          </EuiTitle>
          <EuiBasicTable
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
                    isOpen={isPopoverOpen}
                    closePopover={closePopover}
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
                    <EuiPagination
                      pageCount={pageCount}
                      activePage={activePage}
                      onPageClick={goToPage}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </FooterAction>
        </BasicTableContainer>
      </EuiPanel>
    );
  }
);

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
