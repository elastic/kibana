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
} from '@elastic/eui';
import { isEmpty, noop, getOr } from 'lodash/fp';
import React, { memo, useState, useEffect } from 'react';
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
  headerCount: number;
  headerSupplement?: React.ReactElement;
  headerTitle: string | React.ReactElement;
  headerTooltip?: string;
  headerUnit: string | React.ReactElement;
  itemsPerRow?: ItemsPerRow[];
  limit: number;
  loading: boolean;
  loadingTitle?: string;
  loadPage: (activePage: number) => void;
  onChange?: (criteria: Criteria) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pageOfItems: any[];
  sorting?: SortingBasicTable;
  totalCount: number;
  updateActivePage: (activePage: number) => void;
  updateLimitPagination: (limit: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateProps?: { [key: string]: any };
}

export interface Columns<T> {
  field?: string;
  name: string | React.ReactNode;
  isMobileHeader?: boolean;
  sortable?: boolean;
  truncateText?: boolean;
  hideForMobile?: boolean;
  render?: (item: T) => void;
  width?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PaginatedTable = memo<BasicTableProps<any>>(
  ({
    columns,
    headerCount,
    headerSupplement,
    headerTitle,
    headerTooltip,
    headerUnit,
    itemsPerRow,
    limit,
    loading,
    loadingTitle,
    loadPage,
    onChange = noop,
    pageOfItems,
    sorting = null,
    totalCount,
    updateActivePage,
    updateLimitPagination,
    updateProps,
  }) => {
    const [activePage, setActivePage] = useState(0);
    const [isEmptyTable, setEmptyTable] = useState(pageOfItems.length === 0);
    const [isPopoverOpen, setPopoverOpen] = useState(false);
    const pageCount = Math.ceil(totalCount / limit);
    const effectDeps = updateProps ? [limit, ...Object.values(updateProps)] : [limit];
    useEffect(() => {
      if (activePage !== 0) {
        setActivePage(0);
        updateActivePage(0);
      }
    }, effectDeps);

    const onButtonClick = () => {
      setPopoverOpen(!isPopoverOpen);
    };

    const closePopover = () => {
      setPopoverOpen(false);
    };

    const goToPage = (newActivePage: number) => {
      setActivePage(newActivePage);
      loadPage(newActivePage);
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
            text={`${i18n.LOADING} ${loadingTitle ? loadingTitle : headerTitle}`}
            data-test-subj="InitialLoadingPanelPaginatedTable"
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
        {`${i18n.ROWS}: ${limit}`}
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
                text={`${i18n.LOADING} ${loadingTitle ? loadingTitle : headerTitle}`}
                position="absolute"
                zIndex={3}
                data-test-subj="LoadingPanelPaginatedTable"
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
                      data-test-subj="numberedPagination"
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

const BasicTable = styled(EuiBasicTable)`
  tbody {
    th,
    td {
      vertical-align: top;
    }
  }
`;
