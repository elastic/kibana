/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useMemo, useState, useEffect } from 'react';
import { EuiFlexItem, EuiText, EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { useStyles } from './styles';
import type { IndexPattern, GlobalFilter } from '../../types';
import { useSetFilter } from '../../hooks';
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

const Wrapper = styled.div`
  margin-top: -${({ theme }) => theme.eui.euiSizeS};
`;

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
  const [pageNumber, setPageNumber] = useState(0);
  const styles = useStyles();

  const filterQueryWithTimeRange = useMemo(() => {
    return addTimerangeToQuery(
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
    sortDirection,
    pageNumber
  );
  //   console.log(data)

  const onTableChange = ({ sort = {} }) => {
    const { field: sortField, direction: sortDirection } = sort;

    setSortField(sortField);
    setSortDirection(sortDirection);
    // setPageNumber(pageNumber => pageNumber +  0)

    fetchNextPage();
  };

  useEffect(() => {
    fetchNextPage();
  }, [fetchNextPage]);

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
        data.pages[0].map((aggResult: ContainerNameWidgetDataValueMap) => {
          return getFilterForValueButton({
            field: CONTAINER_IMAGE_NAME,
            filterManager,
            size: 'xs',
            onClick: () => {},
            onFilterAdded: () => {},
            ownFocus: false,
            showTooltip: true,
            value: aggResult.key,
          });
        }),

      filterOutButtons:
        data &&
        data.pages[0].map((aggResult: ContainerNameWidgetDataValueMap) => {
          return getFilterOutValueButton({
            field: CONTAINER_IMAGE_NAME,
            filterManager,
            size: 'xs',
            onClick: () => {},
            onFilterAdded: () => {},
            ownFocus: false,
            showTooltip: true,
            value: aggResult.key,
          });
        }),
    };

    return result;
  }, [data, getFilterForValueButton, getFilterOutValueButton, filterManager, hoveredFilter]);

  const widgetTitle = i18n.translate(
    'xpack.kubernetesSecurity.containerNameWidget.ContainerImage',
    {
      defaultMessage: 'Container Images Session',
    }
  );

  //   const containerNameArrayx: ContainerNameArrayDataValue[] = data
  //     ? data.map((aggResult: ContainerNameWidgetDataValueMap) => {
  //         return {
  //           name: aggResult.key,
  //           count: aggResult.count_by_aggs.value,
  //         };
  //       })
  //     : [];

  const containerNameArray: ContainerNameArrayDataValue[] = useMemo(() => {
    return data
      ? data.pages[0].map((aggResult: ContainerNameWidgetDataValueMap) => {
          return {
            name: aggResult.key,
            count: aggResult.count_by_aggs.value,
          };
        })
      : [];
  }, [data]);

  const columns = useMemo(() => {
    if (
      filterButtons.filterForButtons === undefined &&
      filterButtons.filterOutButtons === undefined
    ) {
      return [];
    }

    return [
      {
        field: 'name',
        name: widgetTitle,
        'data-test-subj': 'containserImageNameSessionCount',
        render: (name: string) => {
          const indexHelper = containerNameArray.findIndex((obj) => {
            return obj.name === name;
          });
          return (
            <EuiFlexItem
              key={`percentage-widget--haha}`}
              onMouseEnter={() => setHoveredFilter(indexHelper)}
              onMouseLeave={() => setHoveredFilter(null)}
              data-test-subj={'test-alpha'}
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
        sortable: true,
      },
      {
        field: 'count',
        name: 'Count',
        'data-test-subj': 'containerImageNameSessionCount',
        render: (count: number) => {
          return <span css={styles.countValue}>{count}</span>;
        },
        sortable: true,
        align: 'right',
      },
    ];
  }, [filterButtons.filterForButtons, filterButtons.filterOutButtons, containerNameArray]);

  //   const columnsx = [
  //     {
  //       field: 'name',
  //       name: widgetTitle,
  //       'data-test-subj': 'containserImageNameSessionCount',
  //       render: (name: string) => {
  //         const indexHelper = containerNameArray.findIndex((obj) => {
  //           console.log(name);
  //           return obj.name === name;
  //         });
  //         return (
  //           <EuiFlexItem
  //             key={`percentage-widget--haha}`}
  //             onMouseEnter={() => setHoveredFilter(indexHelper)}
  //             onMouseLeave={() => setHoveredFilter(null)}
  //             data-test-subj={'test-alpha'}
  //           >
  //             <EuiText size="xs" css={styles.dataInfo}>
  //               {name}
  //               {true && (
  //                 <div css={styles.filters}>
  //                   {filterButtons.filterForButtons[indexHelper]}
  //                   {filterButtons.filterOutButtons[indexHelper]}
  //                 </div>
  //               )}
  //             </EuiText>
  //           </EuiFlexItem>
  //         );
  //       },
  //       align: 'left',
  //     },
  //     {
  //       field: 'count',
  //       name: 'Count',
  //       'data-test-subj': 'containerImageNameSessionCount',
  //       render: (count: number) => {
  //         return <span css={styles.countValue}>{count}</span>;
  //       },
  //       sortable: true,
  //       align: 'right',
  //     },
  //   ];

  //   const sorting = {
  //       sort: {
  //           field : 'count',
  //           direction : 'asc',
  //       },
  //   }

  return (
    <Wrapper
      data-test-subj="containerNameSessionTable"
      className="eui-yScroll"
      css={styles.container}
    >
      <EuiBasicTable
        tableCaption="Trial"
        aria-label="Container Name Session Widget"
        items={containerNameArray}
        columns={columns}
        sorting={sorting}
        onChange={onTableChange}
      />
    </Wrapper>
  );
};
