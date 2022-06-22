/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useMemo, useState } from 'react';
import { EuiFlexItem, EuiText, EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStyles } from './styles';
import type { IndexPattern, GlobalFilter } from '../../types';
import { useSetFilter } from '../../hooks';
import { addTimerangeToQuery } from '../../utils/add_timerange_to_query';
import { useFetchContainerNameData } from './hooks';
import { CONTAINER_IMAGE_NAME } from '../../../common/constants';

export interface ContainerNameWidgetDataValueMap {
  key: string;
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
  const styles = useStyles();

  const filterQueryWithTimeRange = useMemo(() => {
    return addTimerangeToQuery(
      globalFilter.filterQuery,
      globalFilter.startDate,
      globalFilter.endDate
    );
  }, [globalFilter.filterQuery, globalFilter.startDate, globalFilter.endDate]);

  const { data } = useFetchContainerNameData(
    filterQueryWithTimeRange,
    widgetKey,
    groupedBy,
    countBy,
    indexPattern?.title
  );

  const { getFilterForValueButton, getFilterOutValueButton, filterManager } = useSetFilter();
  const filterButtons = useMemo(() => {
    const result: FilterButtons = {
      filterForButtons:
        data &&
        data.map((aggResult: ContainerNameWidgetDataValueMap) => {
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
        data.map((aggResult: ContainerNameWidgetDataValueMap) => {
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
  }, [data, getFilterForValueButton, getFilterOutValueButton, filterManager]);

  const widgetTitle = i18n.translate(
    'xpack.kubernetesSecurity.containerNameWidget.ContainerImage',
    {
      defaultMessage: 'Container Images Session',
    }
  );

  const containerNameArray: ContainerNameArrayDataValue[] = data
    ? data.map((aggResult: ContainerNameWidgetDataValueMap) => {
        return {
          name: aggResult.key,
          count: aggResult.count_by_aggs.value,
        };
      })
    : [];

  const columns = [
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

  const sorting = {
    sort: {
      field: 'count',
      direction: 'desc',
    },
    allownNeutralSort: true,
  };

  return (
    <div css={styles.container}>
      <EuiInMemoryTable
        items={containerNameArray}
        columns={columns}
        pagination={true}
        sorting={sorting}
      />
    </div>
  );
};
