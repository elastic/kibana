/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { chunk } from 'lodash';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTableFieldDataColumnType,
  EuiBasicTable,
  CriteriaWithPagination,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { InspectButtonContainer } from '../../../common/components/inspect';
import { HeaderSection } from '../../../common/components/header_section';
import { LinkPanelListItem } from './types';

// @ts-expect-error TS2769
const StyledTable = styled(EuiBasicTable)`
  [data-test-subj='panel-link'],
  [data-test-subj='panel-no-link'] {
    opacity: 0;
  }
  tr:hover {
    [data-test-subj='panel-link'],
    [data-test-subj='panel-no-link'] {
      opacity: 1;
    }
  }
`;

const PAGE_SIZE = 5;

const sortAndChunkItems = (
  listItems: LinkPanelListItem[],
  sortField: string | number,
  sortDirection: 'asc' | 'desc'
) => {
  const sortedItems = [...listItems].sort((a, b) => {
    const aSortValue = a[sortField];
    const bSortValue = b[sortField];
    if (typeof aSortValue !== 'undefined' && typeof bSortValue !== 'undefined') {
      if (aSortValue === bSortValue) {
        return a.title > b.title ? 1 : a.title < b.title ? -1 : 0;
      }
      return aSortValue > bSortValue ? 1 : aSortValue < bSortValue ? -1 : 0;
    }
    return 0;
  });
  if (sortDirection === 'desc') {
    sortedItems.reverse();
  }
  return chunk(sortedItems, PAGE_SIZE);
};

const LinkPanelComponent = ({
  button,
  columns,
  dataTestSubj,
  defaultSortField,
  defaultSortOrder,
  infoPanel,
  inspectQueryId,
  listItems,
  panelTitle,
  splitPanel,
  subtitle,
}: {
  button?: React.ReactNode;
  columns: Array<EuiTableFieldDataColumnType<LinkPanelListItem>>;
  dataTestSubj: string;
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
  infoPanel?: React.ReactNode;
  inspectQueryId?: string;
  listItems: LinkPanelListItem[];
  panelTitle: string;
  splitPanel: React.ReactNode;
  subtitle: React.ReactNode;
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [sortField, setSortField] = useState<string | number>(defaultSortField ?? 'title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortOrder ?? 'asc');

  const onTableChange = ({ page, sort }: CriteriaWithPagination<LinkPanelListItem>) => {
    const { index } = page;
    setPageIndex(index);
    if (sort) {
      const { field, direction } = sort;
      setSortField(field);
      setSortDirection(direction);
    }
  };

  const chunkedItems = useMemo(
    () => sortAndChunkItems(listItems, sortField, sortDirection),
    [listItems, sortDirection, sortField]
  );

  const pagination = useMemo(
    () => ({
      showPerPageOptions: false,
      pageIndex,
      pageSize: PAGE_SIZE,
      totalItemCount: listItems.length,
    }),
    [pageIndex, listItems.length]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        direction: sortDirection,
        field: sortField,
      },
    }),
    [sortField, sortDirection]
  );

  return (
    <>
      <EuiSpacer data-test-subj="spacer" size="l" />
      <EuiFlexGroup gutterSize="l" justifyContent="spaceBetween" data-test-subj={dataTestSubj}>
        <EuiFlexItem grow={1}>
          <InspectButtonContainer>
            <EuiPanel hasBorder>
              <HeaderSection id={inspectQueryId} subtitle={subtitle} title={panelTitle}>
                <>{button}</>
              </HeaderSection>
              {splitPanel}
              {infoPanel}
              {chunkedItems.length > 0 && (
                <StyledTable
                  columns={columns}
                  itemId="id"
                  items={chunkedItems[pageIndex] || []}
                  onChange={onTableChange}
                  pagination={pagination}
                  sorting={sorting}
                />
              )}
            </EuiPanel>
          </InspectButtonContainer>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const LinkPanel = React.memo(LinkPanelComponent);

LinkPanel.displayName = 'LinkPanel';
