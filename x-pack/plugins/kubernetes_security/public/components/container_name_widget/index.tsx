/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useMemo, useState, useRef, useCallback } from 'react';
import { EuiBasicTable, EuiTableSortingType, EuiProgress, EuiBasicTableColumn } from '@elastic/eui';
import { useStyles } from './styles';
import { ContainerNameRow } from './container_name_row';
import type { IndexPattern, GlobalFilter } from '../../types';
import { useSetFilter, useScroll } from '../../hooks';
import { addTimerangeAndDefaultFilterToQuery } from '../../utils/add_timerange_and_default_filter_to_query';
import { useFetchContainerNameData } from './hooks';
import { CONTAINER_IMAGE_NAME } from '../../../common/constants';
import {
  CONTAINER_NAME_SESSION,
  CONTAINER_NAME_SESSION_COUNT_COLUMN,
  CONTAINER_NAME_SESSION_ARIA_LABEL,
} from '../../../common/translations';
import { addCommasToNumber } from '../../utils/add_commas_to_number';

export const LOADING_TEST_ID = 'kubernetesSecurity:containerNameWidgetLoading';
export const NAME_COLUMN_TEST_ID = 'kubernetesSecurity:containerImageNameSessionNameColumn';
export const COUNT_COLUMN_TEST_ID = 'kubernetesSecurity:containerImageNameSessionCountColumn';
export const CONTAINER_NAME_TABLE_TEST_ID = 'kubernetesSecurity:containerNameSessionTable';

export interface ContainerNameWidgetDataValueMap {
  key: string;
  doc_count: number;
  count_by_aggs: {
    value: number;
  };
}

export interface ContainerNameArrayDataValue {
  name: string;
  count: string;
}

export interface ContainerNameWidgetDeps {
  widgetKey: string;
  indexPattern?: IndexPattern;
  globalFilter: GlobalFilter;
  groupedBy: string;
  countBy?: string;
}

interface FilterButtons {
  filterForButtons: ReactNode[];
  filterOutButtons: ReactNode[];
}

interface CopyButtons {
  copyButtons: ReactNode[];
}

export const ContainerNameWidget = ({
  widgetKey,
  indexPattern,
  globalFilter,
  groupedBy,
  countBy,
}: ContainerNameWidgetDeps) => {
  const [sortField, setSortField] = useState('count');
  const [sortDirection, setSortDirection] = useState('desc');
  const styles = useStyles();

  const filterQueryWithTimeRange = useMemo(() => {
    return addTimerangeAndDefaultFilterToQuery(
      globalFilter.filterQuery,
      globalFilter.startDate,
      globalFilter.endDate
    );
  }, [globalFilter.filterQuery, globalFilter.startDate, globalFilter.endDate]);

  const { data, fetchNextPage, isFetchingNextPage, isLoading } = useFetchContainerNameData(
    filterQueryWithTimeRange,
    widgetKey,
    groupedBy,
    countBy,
    indexPattern?.title,
    sortDirection
  );

  const onTableChange = useCallback(({ sort = {} }) => {
    // @ts-ignore
    const { field: sortingField, direction: sortingDirection } = sort;

    setSortField(sortingField);
    setSortDirection(sortingDirection);
  }, []);

  const sorting: EuiTableSortingType<ContainerNameArrayDataValue> = {
    sort: {
      field: sortField as keyof ContainerNameArrayDataValue,
      direction: sortDirection as 'desc' | 'asc',
    },
    enableAllColumns: true,
  };

  const { getFilterForValueButton, getFilterOutValueButton, getCopyButton, filterManager } =
    useSetFilter();
  const filterButtons = useMemo((): FilterButtons => {
    const result: FilterButtons = {
      filterForButtons:
        data?.pages
          ?.map((aggsData) => {
            return aggsData?.buckets.map((aggData) => {
              return getFilterForValueButton({
                field: CONTAINER_IMAGE_NAME,
                filterManager,
                size: 'xs',
                onClick: () => {},
                onFilterAdded: () => {},
                ownFocus: false,
                showTooltip: true,
                value: aggData.key as string,
              });
            });
          })
          .flat() || [],

      filterOutButtons:
        data?.pages
          ?.map((aggsData) => {
            return aggsData?.buckets.map((aggData) => {
              return getFilterOutValueButton({
                field: CONTAINER_IMAGE_NAME,
                filterManager,
                size: 'xs',
                onClick: () => {},
                onFilterAdded: () => {},
                ownFocus: false,
                showTooltip: true,
                value: aggData.key as string,
              });
            });
          })
          .flat() || [],
    };
    return result;
  }, [data, getFilterForValueButton, getFilterOutValueButton, filterManager]);

  const copyToClipboardButtons = useMemo((): CopyButtons => {
    const result: CopyButtons = {
      copyButtons:
        data?.pages
          ?.map((aggsData) => {
            return aggsData?.buckets.map((aggData) => {
              return getCopyButton({
                field: CONTAINER_IMAGE_NAME,
                size: 'xs',
                onClick: () => {},
                ownFocus: false,
                showTooltip: true,
                value: aggData.key as string,
              });
            });
          })
          .flat() || [],
    };
    return result;
  }, [data, getCopyButton]);

  const containerNameArray = useMemo((): ContainerNameArrayDataValue[] => {
    return data
      ? data?.pages
          ?.map((aggsData) => {
            return aggsData?.buckets.map((aggData) => {
              return {
                name: aggData.key as string,
                count: addCommasToNumber(aggData.count_by_aggs?.value ?? 0),
              };
            });
          })
          .flat()
      : [];
  }, [data]);

  const columns = useMemo((): Array<EuiBasicTableColumn<ContainerNameArrayDataValue>> => {
    return [
      {
        field: 'name',
        name: CONTAINER_NAME_SESSION,
        'data-test-subj': NAME_COLUMN_TEST_ID,
        render: (name: string) => {
          const indexHelper = containerNameArray.findIndex((obj) => {
            return obj.name === name;
          });
          return (
            <ContainerNameRow
              name={name}
              filterButtonIn={filterButtons.filterForButtons[indexHelper]}
              filterButtonOut={filterButtons.filterOutButtons[indexHelper]}
              copyToClipboardButton={copyToClipboardButtons.copyButtons[indexHelper]}
            />
          );
        },
        align: 'left',
        width: '67%',
        sortable: false,
      },
      {
        field: 'count',
        name: CONTAINER_NAME_SESSION_COUNT_COLUMN,
        width: '33%',
        'data-test-subj': COUNT_COLUMN_TEST_ID,
        render: (count: number) => {
          return <span css={styles.countValue}>{count}</span>;
        },
        sortable: true,
        align: 'right',
      },
    ];
  }, [
    filterButtons.filterForButtons,
    filterButtons.filterOutButtons,
    copyToClipboardButtons.copyButtons,
    containerNameArray,
    styles,
  ]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  useScroll({
    div: scrollerRef.current,
    handler: (pos: number, endReached: boolean) => {
      if (!isFetchingNextPage && endReached) {
        fetchNextPage();
      }
    },
  });

  const cellProps = useMemo(() => {
    return {
      css: styles.cellPad,
    };
  }, [styles.cellPad]);

  return (
    <div
      data-test-subj={CONTAINER_NAME_TABLE_TEST_ID}
      className="eui-yScroll"
      css={styles.container}
      ref={scrollerRef}
    >
      {isLoading && (
        <EuiProgress
          size="xs"
          color="accent"
          position="absolute"
          data-test-subj={LOADING_TEST_ID}
        />
      )}
      <EuiBasicTable
        aria-label={CONTAINER_NAME_SESSION_ARIA_LABEL}
        items={containerNameArray}
        columns={columns}
        sorting={sorting}
        onChange={onTableChange}
        cellProps={cellProps}
      />
    </div>
  );
};
