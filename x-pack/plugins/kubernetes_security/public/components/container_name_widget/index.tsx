/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useMemo, useState, useRef } from 'react';
import { EuiFlexItem, EuiText, EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStyles } from './styles';
import type { IndexPattern, GlobalFilter } from '../../types';
import { useSetFilter, useScroll } from '../../hooks';
import { addTimerangeToQuery } from '../../utils/add_timerange_to_query';
import { useFetchContainerNameData } from './hooks';
import { CONTAINER_IMAGE_NAME } from '../../../common/constants';

export interface ContainerNameWidgetDataValueMap {
  key: string;
  doc_count: number;
  count_by_aggs: {
    value: number;
  };
}

export interface ContainerNameArrayDataValue {
  name: string;
  count: number;
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

export const ContainerNameWidget = ({
  widgetKey,
  indexPattern,
  globalFilter,
  groupedBy,
  countBy,
}: ContainerNameWidgetDeps) => {
  const [hoveredFilter, setHoveredFilter] = useState<number | null>(null);
  const [sortField, setSortField] = useState('count');
  const [sortDirection, setSortDirection] = useState('desc');
  const styles = useStyles();

  const filterQueryWithTimeRange = useMemo(() => {
    return addTimerangeToQuery(
      globalFilter.filterQuery,
      globalFilter.startDate,
      globalFilter.endDate
    );
  }, [globalFilter.filterQuery, globalFilter.startDate, globalFilter.endDate]);

  const { data, fetchNextPage, isFetchingNextPage } = useFetchContainerNameData(
    filterQueryWithTimeRange,
    widgetKey,
    groupedBy,
    countBy,
    indexPattern?.title,
    sortDirection
  );

  const onTableChange = ({ sort = {} }) => {
    // @ts-ignore
    const { field: sortField, direction: sortDirection } = sort;

    setSortField(sortField);
    setSortDirection(sortDirection);
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
    enableAllColumns: true,
  };

  const { getFilterForValueButton, getFilterOutValueButton, filterManager } = useSetFilter();
  const filterButtons = useMemo(() => {
    const result: FilterButtons = {
      filterForButtons:
        data &&
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
                value: aggData.key,
              });
              // here below
            });
          })
          .flat(),

      filterOutButtons:
        data &&
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
                value: aggData.key,
              });
              // here below
            });
          })
          .flat(),
    };
    // return true
    return result;
  }, [data, getFilterForValueButton, getFilterOutValueButton, filterManager, hoveredFilter]);

  const widgetTitle = i18n.translate(
    'xpack.kubernetesSecurity.containerNameWidget.ContainerImage',
    {
      defaultMessage: 'Container Images Session',
    }
  );

  const containerNameArray: ContainerNameArrayDataValue[] = useMemo(() => {
    return data
      ? data?.pages
          ?.map((aggsData) => {
            return aggsData?.buckets.map((aggData) => {
              return {
                name: aggData.key,
                count: aggData.count_by_aggs.value,
              };
            });
          })
          .flat()
      : [];
  }, [data]);

  const columns = useMemo(() => {
    return [
      {
        field: 'name',
        name: widgetTitle,
        'data-test-subj': 'containerImageNameSessionNameColumn',
        render: (name: string) => {
          const indexHelper = containerNameArray.findIndex((obj) => {
            return obj.name === name;
          });

          return (
            <EuiFlexItem
              key={`percentage-widget--haha}`}
              onMouseEnter={() => setHoveredFilter(indexHelper)}
              onMouseLeave={() => setHoveredFilter(null)}
              data-test-subj={'containerNameSessionRow'}
            >
              <EuiText size="xs" css={styles.dataInfo}>
                {name}
                {hoveredFilter === indexHelper && (
                  <div css={styles.filters}>
                    {filterButtons.filterForButtons[indexHelper]}
                    {filterButtons.filterOutButtons[indexHelper]}
                  </div>
                )}
              </EuiText>
            </EuiFlexItem>
          );
        },
        align: 'left',
        sortable: false,
      },
      {
        field: 'count',
        name: 'Count',
        'data-test-subj': 'containerImageNameSessionCountColumn',
        render: (count: number) => {
          return <span css={styles.countValue}>{count}</span>;
        },
        sortable: true,
        align: 'right',
      },
    ];
  }, [filterButtons.filterForButtons, filterButtons.filterOutButtons, containerNameArray]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  useScroll({
    div: scrollerRef.current,
    handler: (pos: number, endReached: boolean) => {
      if (!isFetchingNextPage && endReached) {
        fetchNextPage();
      }
    },
  });

  return (
    <div
      data-test-subj="containerNameSessionTable"
      className="eui-yScroll"
      css={styles.container}
      ref={scrollerRef}
    >
      <EuiBasicTable
        tableCaption="Container Name Session Table"
        aria-label="Container Name Session Widget"
        items={containerNameArray}
        columns={columns}
        sorting={sorting}
        onChange={onTableChange}
      />
    </div>
  );
};
