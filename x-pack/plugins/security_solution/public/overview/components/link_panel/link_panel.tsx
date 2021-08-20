/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
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

const PAGE_SIZE = 5;

const sortAndChunkItems = (
  listItems: LinkPanelListItem[],
  sortField: string | number,
  direction: 'asc' | 'desc'
) => {
  const sortedItems = [...listItems].sort((a, b) => {
    if (typeof a[sortField] !== 'undefined' && typeof b[sortField] !== 'undefined') {
      if (a[sortField]! > b[sortField]! || (a[sortField] === b[sortField] && a.title > b.title)) {
        return 1;
      } else if (
        a[sortField]! < b[sortField]! ||
        (a[sortField] === b[sortField] && a.title < b.title)
      ) {
        return -1;
      }
    }
    return 0;
  });
  if (direction === 'desc') {
    sortedItems.reverse();
  }
  return chunk(sortedItems, PAGE_SIZE);
};

const LinkPanelComponent = ({
  button,
  columns,
  infoPanel,
  listItems,
  panelTitle,
  splitPanel,
  subtitle,
  inspectQueryId,
}: {
  button: React.ReactNode;
  columns: Array<EuiTableFieldDataColumnType<LinkPanelListItem>>;
  infoPanel?: React.ReactNode;
  listItems: LinkPanelListItem[];
  panelTitle: string;
  splitPanel: React.ReactNode;
  subtitle: React.ReactNode;
  inspectQueryId?: string;
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [sortField, setSortField] = useState<string | number>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const onTableChange = ({ page, sort }: CriteriaWithPagination<LinkPanelListItem>) => {
    const { index } = page;
    setPageIndex(index);
    if (sort) {
      const { field, direction } = sort;
      setSortField(field);
      setSortDirection(direction);
    }
  };

  const chunkedItems = useMemo(() => sortAndChunkItems(listItems, sortField, sortDirection), [
    listItems,
    sortField,
    sortDirection,
  ]);

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize: PAGE_SIZE,
      totalItemCount: listItems.length,
      hidePerPageOptions: true,
    }),
    [pageIndex, listItems.length]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    }),
    [sortField, sortDirection]
  );

  return (
    <>
      <EuiSpacer data-test-subj="spacer" size="l" />
      <EuiFlexGroup
        gutterSize="l"
        justifyContent="spaceBetween"
        data-test-subj="cti-dashboard-links"
      >
        <EuiFlexItem grow={1}>
          <InspectButtonContainer>
            <EuiPanel hasBorder>
              <HeaderSection id={inspectQueryId} subtitle={subtitle} title={panelTitle}>
                <>{button}</>
              </HeaderSection>
              {splitPanel}
              {infoPanel}
              <EuiBasicTable
                items={chunkedItems[pageIndex] || []}
                itemId="id"
                columns={columns}
                pagination={pagination}
                sorting={sorting}
                onChange={onTableChange}
              />
            </EuiPanel>
          </InspectButtonContainer>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

LinkPanelComponent.displayName = 'LinkPanel';

export const LinkPanel = React.memo(LinkPanelComponent);
