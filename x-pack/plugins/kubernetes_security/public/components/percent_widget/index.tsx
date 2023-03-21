/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiText } from '@elastic/eui';
import { useStyles } from './styles';
import type { IndexPattern, GlobalFilter } from '../../types';
import { useSetFilter } from '../../hooks';
import { addTimerangeAndDefaultFilterToQuery } from '../../utils/add_timerange_and_default_filter_to_query';
import { AggregateResult } from '../../../common/types/aggregate';
import { useFetchPercentWidgetData } from './hooks';

export const LOADING_TEST_ID = 'kubernetesSecurity:percentWidgetLoading';
export const PERCENT_DATA_TEST_ID = 'kubernetesSecurity:percentWidgetData';

export interface PercenWidgetDataValueMap {
  name: string;
  fieldName: string;
  color: string;
  shouldHideFilter?: boolean;
}

export interface PercentWidgetDeps {
  title: ReactNode;
  dataValueMap: Record<string, PercenWidgetDataValueMap>;
  widgetKey: string;
  indexPattern?: IndexPattern;
  globalFilter: GlobalFilter;
  groupedBy: string;
  countBy?: string;
  onReduce: (result: AggregateResult) => Record<string, number>;
}

interface FilterButtons {
  filterForButtons: ReactNode[];
  filterOutButtons: ReactNode[];
}

export const PercentWidget = ({
  title,
  dataValueMap,
  widgetKey,
  indexPattern,
  globalFilter,
  groupedBy,
  countBy,
  onReduce,
}: PercentWidgetDeps) => {
  const [hoveredFilter, setHoveredFilter] = useState<number | null>(null);
  const styles = useStyles();

  const filterQueryWithTimeRange = useMemo(() => {
    return addTimerangeAndDefaultFilterToQuery(
      globalFilter.filterQuery,
      globalFilter.startDate,
      globalFilter.endDate
    );
  }, [globalFilter.filterQuery, globalFilter.startDate, globalFilter.endDate]);

  const { data, isLoading } = useFetchPercentWidgetData(
    onReduce,
    filterQueryWithTimeRange,
    widgetKey,
    groupedBy,
    countBy,
    indexPattern?.title
  );

  const { getFilterForValueButton, getFilterOutValueButton, filterManager } = useSetFilter();
  const dataValueSum = useMemo(
    () => (data ? Object.keys(data).reduce((sumSoFar, current) => sumSoFar + data[current], 0) : 0),
    [data]
  );
  const filterButtons = useMemo(() => {
    const result: FilterButtons = {
      filterForButtons: [],
      filterOutButtons: [],
    };
    Object.keys(dataValueMap).forEach((groupedByValue) => {
      if (!dataValueMap[groupedByValue].shouldHideFilter) {
        result.filterForButtons.push(
          getFilterForValueButton({
            field: dataValueMap[groupedByValue].fieldName,
            filterManager,
            size: 'xs',
            onClick: () => {},
            onFilterAdded: () => {},
            ownFocus: false,
            showTooltip: true,
            value: [groupedByValue],
          })
        );
        result.filterOutButtons.push(
          getFilterOutValueButton({
            field: dataValueMap[groupedByValue].fieldName,
            filterManager,
            size: 'xs',
            onClick: () => {},
            onFilterAdded: () => {},
            ownFocus: false,
            showTooltip: true,
            value: [groupedByValue],
          })
        );
      }
    });

    return result;
  }, [dataValueMap, filterManager, getFilterForValueButton, getFilterOutValueButton]);

  return (
    <div css={styles.container}>
      {isLoading && (
        <EuiProgress
          size="xs"
          color="accent"
          position="absolute"
          data-test-subj={LOADING_TEST_ID}
        />
      )}
      <div css={styles.title}>{title}</div>
      <EuiFlexGroup direction="column" gutterSize="s">
        {Object.keys(dataValueMap).map((groupedByValue, idx) => {
          const value = data?.[groupedByValue] || 0;
          return (
            <EuiFlexItem
              key={`percentage-widget--${dataValueMap[groupedByValue].name}`}
              onMouseEnter={() => setHoveredFilter(idx)}
              onMouseLeave={() => setHoveredFilter(null)}
              data-test-subj={PERCENT_DATA_TEST_ID}
            >
              <EuiText size="xs" css={styles.dataInfo}>
                {dataValueMap[groupedByValue].name}
                {hoveredFilter === idx && (
                  <div css={styles.filters}>
                    {filterButtons.filterForButtons[idx]}
                    {filterButtons.filterOutButtons[idx]}
                  </div>
                )}
                <span css={styles.dataValue}>{value}</span>
              </EuiText>
              <div css={styles.percentageBackground}>
                <div
                  css={{
                    ...styles.percentageBar,
                    width: `${(value / dataValueSum || 0) * 100}%`,
                    backgroundColor: dataValueMap[groupedByValue].color,
                  }}
                />
              </div>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </div>
  );
};
