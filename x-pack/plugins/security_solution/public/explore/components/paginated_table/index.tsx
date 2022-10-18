/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiBasicTableProps,
  EuiGlobalToastListToast as Toast,
  EuiTableRowCellProps,
} from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiPagination,
  EuiPopover,
} from '@elastic/eui';
import { noop } from 'lodash/fp';
import type { FC, ComponentType } from 'react';
import React, { memo, useState, useMemo, useEffect, useCallback } from 'react';
import styled from 'styled-components';

import type { Direction } from '../../../../common/search_strategy';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../common/constants';
import type { HostsTableColumns } from '../../hosts/components/hosts_table';
import type { NetworkDnsColumns } from '../../network/components/network_dns_table/columns';
import type { NetworkHttpColumns } from '../../network/components/network_http_table/columns';
import type {
  NetworkTopNFlowColumns,
  NetworkTopNFlowColumnsNetworkDetails,
} from '../../network/components/network_top_n_flow_table/columns';
import type {
  NetworkTopCountriesColumns,
  NetworkTopCountriesColumnsNetworkDetails,
} from '../../network/components/network_top_countries_table/columns';
import type { TlsColumns } from '../../network/components/tls_table/columns';
import type { UncommonProcessTableColumns } from '../../hosts/components/uncommon_process_table';
import type { HostRiskScoreColumns } from '../../hosts/components/host_risk_score_table';

import type { UsersColumns } from '../../network/components/users_table/columns';
import { HeaderSection } from '../../../common/components/header_section';
import { Loader } from '../../../common/components/loader';
import { useStateToaster } from '../../../common/components/toasters';

import * as i18n from './translations';
import { Panel } from '../../../common/components/panel';
import { InspectButtonContainer } from '../../../common/components/inspect';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import type { UsersTableColumns } from '../../users/components/all_users';
import type { AuthTableColumns } from '../authentication/types';

const DEFAULT_DATA_TEST_SUBJ = 'paginated-table';

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

declare type HostsTableColumnsTest = [
  Columns<string>,
  Columns<string>,
  Columns<string>,
  Columns<string>
];

declare type BasicTableColumns =
  | AuthTableColumns
  | HostsTableColumns
  | HostsTableColumnsTest
  | NetworkDnsColumns
  | NetworkHttpColumns
  | NetworkTopCountriesColumns
  | NetworkTopCountriesColumnsNetworkDetails
  | NetworkTopNFlowColumns
  | NetworkTopNFlowColumnsNetworkDetails
  | HostRiskScoreColumns
  | TlsColumns
  | UncommonProcessTableColumns
  | UsersColumns
  | UsersTableColumns;

declare type SiemTables = BasicTableProps<BasicTableColumns>;

// Using telescoping templates to remove 'any' that was polluting downstream column type checks
export interface BasicTableProps<T> {
  activePage: number;
  columns: T;
  dataTestSubj?: string;
  headerCount: number;
  headerFilters?: string | React.ReactNode;
  headerSupplement?: React.ReactElement;
  headerTitle: string | React.ReactElement;
  headerTooltip?: string;
  headerUnit?: string | React.ReactElement;
  headerSubtitle?: string | React.ReactElement;
  id?: string;
  itemsPerRow?: ItemsPerRow[];
  isInspect?: boolean;
  limit: number;
  loading: boolean;
  loadPage: (activePage: number) => void;
  onChange?: (criteria: Criteria) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pageOfItems: any[];
  setQuerySkip: (skip: boolean) => void;
  showMorePagesIndicator: boolean;
  sorting?: SortingBasicTable;
  split?: boolean;
  stackHeader?: boolean;
  totalCount: number;
  updateActivePage: (activePage: number) => void;
  updateLimitPagination: (limit: number) => void;
}
type Func<T> = (arg: T) => string | number;

export interface Columns<T, U = T> {
  align?: string;
  field?: string;
  mobileOptions?: EuiTableRowCellProps['mobileOptions'];
  name: string | React.ReactNode;
  render?: (item: T, node: U) => React.ReactNode;
  sortable?: boolean | Func<T>;
  truncateText?: boolean;
  width?: string;
}

const PaginatedTableComponent: FC<SiemTables> = ({
  activePage,
  columns,
  dataTestSubj = DEFAULT_DATA_TEST_SUBJ,
  headerCount,
  headerFilters,
  headerSupplement,
  headerTitle,
  headerTooltip,
  headerUnit,
  headerSubtitle,
  id,
  isInspect,
  itemsPerRow,
  limit,
  loading,
  loadPage,
  onChange = noop,
  pageOfItems,
  setQuerySkip,
  showMorePagesIndicator,
  sorting = null,
  split,
  stackHeader,
  totalCount,
  updateActivePage,
  updateLimitPagination,
}) => {
  const [myLoading, setMyLoading] = useState(loading);
  const [myActivePage, setActivePage] = useState(activePage);
  const [loadingInitial, setLoadingInitial] = useState(headerCount === -1);
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const pageCount = Math.ceil(totalCount / limit);
  const dispatchToaster = useStateToaster()[1];

  useEffect(() => {
    setActivePage(activePage);
  }, [activePage]);

  useEffect(() => {
    if (headerCount >= 0 && loadingInitial) {
      setLoadingInitial(false);
    }
  }, [loadingInitial, headerCount]);

  useEffect(() => {
    setMyLoading(loading);
  }, [loading]);

  const onButtonClick = () => {
    setPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopoverOpen(false);
  };

  const goToPage = (newActivePage: number) => {
    if ((newActivePage + 1) * limit >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      const toast: Toast = {
        id: 'PaginationWarningMsg',
        title: headerTitle + i18n.TOAST_TITLE,
        color: 'warning',
        iconType: 'alert',
        toastLifeTimeMs: 10000,
        text: i18n.TOAST_TEXT,
      };
      return dispatchToaster({
        type: 'addToaster',
        toast,
      });
    }
    setActivePage(newActivePage);
    loadPage(newActivePage);
    updateActivePage(newActivePage);
  };

  const button = (
    <EuiButtonEmpty
      size="xs"
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
  const PaginationWrapper = showMorePagesIndicator ? PaginationEuiFlexItem : EuiFlexItem;

  const tableSorting = useMemo(
    () =>
      sorting
        ? {
            sort: {
              field: sorting.field,
              direction: sorting.direction,
            },
          }
        : undefined,
    [sorting]
  );

  const { toggleStatus, setToggleStatus } = useQueryToggle(id);

  const toggleQuery = useCallback(
    (status: boolean) => {
      setToggleStatus(status);
      // toggle on = skipQuery false
      setQuerySkip(!status);
    },
    [setQuerySkip, setToggleStatus]
  );

  return (
    <InspectButtonContainer show={!loadingInitial}>
      <Panel data-test-subj={`${dataTestSubj}-loading-${loading}`} loading={loading}>
        <HeaderSection
          toggleStatus={toggleStatus}
          toggleQuery={toggleQuery}
          headerFilters={headerFilters}
          id={id}
          split={split}
          stackHeader={stackHeader}
          subtitle={
            !loadingInitial && headerSubtitle
              ? `${i18n.SHOWING}: ${headerSubtitle}`
              : headerUnit &&
                `${i18n.SHOWING}: ${
                  headerCount >= 0 ? headerCount.toLocaleString() : 0
                } ${headerUnit}`
          }
          title={headerTitle}
          tooltip={headerTooltip}
        >
          {!loadingInitial && headerSupplement}
        </HeaderSection>
        {toggleStatus &&
          (loadingInitial ? (
            <EuiLoadingContent data-test-subj="initialLoadingPanelPaginatedTable" lines={10} />
          ) : (
            <>
              <BasicTable
                data-test-subj="paginated-basic-table"
                columns={columns}
                items={pageOfItems}
                onChange={onChange}
                sorting={tableSorting}
              />
              <FooterAction>
                <EuiFlexItem>
                  {itemsPerRow &&
                    itemsPerRow.length > 0 &&
                    totalCount >= itemsPerRow[0].numberOfRow && (
                      <EuiPopover
                        id="customizablePagination"
                        data-test-subj="loadingMoreSizeRowPopover"
                        button={button}
                        isOpen={isPopoverOpen}
                        closePopover={closePopover}
                        panelPaddingSize="none"
                        repositionOnScroll
                      >
                        <EuiContextMenuPanel
                          items={rowItems}
                          data-test-subj="loadingMorePickSizeRow"
                        />
                      </EuiPopover>
                    )}
                </EuiFlexItem>

                <PaginationWrapper grow={false}>
                  {totalCount > 0 && (
                    <EuiPagination
                      data-test-subj="numberedPagination"
                      pageCount={pageCount}
                      activePage={myActivePage}
                      onPageClick={goToPage}
                    />
                  )}
                </PaginationWrapper>
              </FooterAction>
              {(isInspect || myLoading) && (
                <Loader data-test-subj="loadingPanelPaginatedTable" overlay size="xl" />
              )}
            </>
          ))}
      </Panel>
    </InspectButtonContainer>
  );
};

export const PaginatedTable = memo(PaginatedTableComponent);

type BasicTableType = ComponentType<EuiBasicTableProps<any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
const BasicTable = styled(EuiBasicTable as BasicTableType)`
  tbody {
    th,
    td {
      vertical-align: top;
    }

    .euiTableCellContent {
      display: block;
    }
  }
` as any; // eslint-disable-line @typescript-eslint/no-explicit-any

BasicTable.displayName = 'BasicTable';

const FooterAction = styled(EuiFlexGroup).attrs(() => ({
  alignItems: 'center',
  responsive: false,
}))`
  margin-top: ${({ theme }) => theme.eui.euiSizeXS};
`;

FooterAction.displayName = 'FooterAction';

export const PaginationEuiFlexItem = styled(EuiFlexItem)`
  @media only screen and (min-width: ${({ theme }) => theme.eui.euiBreakpoints.m}) {
    .euiButtonIcon:last-child {
      margin-left: 28px;
    }

    .euiPagination {
      position: relative;
    }

    .euiPagination::before {
      bottom: 0;
      color: ${({ theme }) => theme.eui.euiButtonColorDisabled};
      content: '\\2026';
      font-size: ${({ theme }) => theme.eui.euiFontSizeS};
      padding: 5px ${({ theme }) => theme.eui.euiSizeS};
      position: absolute;
      right: ${({ theme }) => theme.eui.euiSizeL};
    }
  }
`;

PaginationEuiFlexItem.displayName = 'PaginationEuiFlexItem';
