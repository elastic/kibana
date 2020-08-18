/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiBasicTableProps,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiGlobalToastListToast as Toast,
  EuiLoadingContent,
  EuiPagination,
  EuiPopover,
  Direction,
} from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { FC, memo, useState, useEffect, ComponentType } from 'react';
import styled from 'styled-components';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../common/constants';
import { AuthTableColumns } from '../../../hosts/components/authentications_table';
import { HostsTableColumns } from '../../../hosts/components/hosts_table';
import { NetworkDnsColumns } from '../../../network/components/network_dns_table/columns';
import { NetworkHttpColumns } from '../../../network/components/network_http_table/columns';
import {
  NetworkTopNFlowColumns,
  NetworkTopNFlowColumnsIpDetails,
} from '../../../network/components/network_top_n_flow_table/columns';
import {
  NetworkTopCountriesColumns,
  NetworkTopCountriesColumnsIpDetails,
} from '../../../network/components/network_top_countries_table/columns';
import { TlsColumns } from '../../../network/components/tls_table/columns';
import { UncommonProcessTableColumns } from '../../../hosts/components/uncommon_process_table';
import { UsersColumns } from '../../../network/components/users_table/columns';
import { HeaderSection } from '../header_section';
import { Loader } from '../loader';
import { useStateToaster } from '../toasters';

import * as i18n from './translations';
import { Panel } from '../panel';
import { InspectButtonContainer } from '../inspect';

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
  | NetworkTopCountriesColumnsIpDetails
  | NetworkTopNFlowColumns
  | NetworkTopNFlowColumnsIpDetails
  | TlsColumns
  | UncommonProcessTableColumns
  | UsersColumns;

declare type SiemTables = BasicTableProps<BasicTableColumns>;

// Using telescoping templates to remove 'any' that was polluting downstream column type checks
export interface BasicTableProps<T> {
  activePage: number;
  columns: T;
  dataTestSubj?: string;
  headerCount: number;
  headerSupplement?: React.ReactElement;
  headerTitle: string | React.ReactElement;
  headerTooltip?: string;
  headerUnit: string | React.ReactElement;
  id?: string;
  itemsPerRow?: ItemsPerRow[];
  isInspect?: boolean;
  limit: number;
  loading: boolean;
  loadPage: (activePage: number) => void;
  onChange?: (criteria: Criteria) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pageOfItems: any[];
  showMorePagesIndicator: boolean;
  sorting?: SortingBasicTable;
  totalCount: number;
  updateActivePage: (activePage: number) => void;
  updateLimitPagination: (limit: number) => void;
}
type Func<T> = (arg: T) => string | number;

export interface Columns<T, U = T> {
  align?: string;
  field?: string;
  hideForMobile?: boolean;
  isMobileHeader?: boolean;
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
  headerSupplement,
  headerTitle,
  headerTooltip,
  headerUnit,
  id,
  isInspect,
  itemsPerRow,
  limit,
  loading,
  loadPage,
  onChange = noop,
  pageOfItems,
  showMorePagesIndicator,
  sorting = null,
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

  return (
    <InspectButtonContainer show={!loadingInitial}>
      <Panel data-test-subj={`${dataTestSubj}-loading-${loading}`} loading={loading}>
        <HeaderSection
          id={id}
          subtitle={
            !loadingInitial &&
            `${i18n.SHOWING}: ${headerCount >= 0 ? headerCount.toLocaleString() : 0} ${headerUnit}`
          }
          title={headerTitle}
          tooltip={headerTooltip}
        >
          {!loadingInitial && headerSupplement}
        </HeaderSection>

        {loadingInitial ? (
          <EuiLoadingContent data-test-subj="initialLoadingPanelPaginatedTable" lines={10} />
        ) : (
          <>
            <BasicTable
              columns={columns}
              items={pageOfItems}
              onChange={onChange}
              sorting={
                sorting
                  ? {
                      sort: {
                        field: sorting.field,
                        direction: sorting.direction,
                      },
                    }
                  : undefined
              }
            />
            <FooterAction>
              <EuiFlexItem>
                {itemsPerRow && itemsPerRow.length > 0 && totalCount >= itemsPerRow[0].numberOfRow && (
                  <EuiPopover
                    id="customizablePagination"
                    data-test-subj="loadingMoreSizeRowPopover"
                    button={button}
                    isOpen={isPopoverOpen}
                    closePopover={closePopover}
                    panelPaddingSize="none"
                    repositionOnScroll
                  >
                    <EuiContextMenuPanel items={rowItems} data-test-subj="loadingMorePickSizeRow" />
                  </EuiPopover>
                )}
              </EuiFlexItem>

              <PaginationWrapper grow={false}>
                <EuiPagination
                  data-test-subj="numberedPagination"
                  pageCount={pageCount}
                  activePage={myActivePage}
                  onPageClick={goToPage}
                />
              </PaginationWrapper>
            </FooterAction>
            {(isInspect || myLoading) && (
              <Loader data-test-subj="loadingPanelPaginatedTable" overlay size="xl" />
            )}
          </>
        )}
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

const PaginationEuiFlexItem = styled(EuiFlexItem)`
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
