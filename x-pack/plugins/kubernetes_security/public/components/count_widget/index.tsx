/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiLoadingSpinner, EuiIconTip } from '@elastic/eui';
import { useStyles } from './styles';
import type { IndexPattern, GlobalFilter } from '../../types';
import { addTimerangeToQuery } from '../../utils/add_timerange_to_query';
import { useFetchCountWidgetData } from './hooks';
import { addResourceTypeToFilterQuery, numberFormatter } from './helpers';

export const LOADING_TEST_ID = 'kubernetesSecurity:count-widget-loading';
export const TOOLTIP_TEST_ID = 'kubernetesSecurity:count-widget-tooltip';

export interface CountWidgetDeps {
  title: string;
  widgetKey: string;
  indexPattern?: IndexPattern;
  globalFilter: GlobalFilter;
  groupedBy: string;
}

export const CountWidget = ({
  title,
  widgetKey,
  indexPattern,
  globalFilter,
  groupedBy,
}: CountWidgetDeps) => {
  const styles = useStyles();

  const filterQueryWithTimeRange = useMemo(() => {
    let globalFilterModified = globalFilter.filterQuery;

    if (widgetKey === 'CountNodesWidgets') {
      globalFilterModified = addResourceTypeToFilterQuery(globalFilter.filterQuery, 'node');
    }

    if (widgetKey === 'CountPodsWidgets') {
      globalFilterModified = addResourceTypeToFilterQuery(globalFilter.filterQuery, 'pod');
    }
    return addTimerangeToQuery(globalFilterModified, globalFilter.startDate, globalFilter.endDate);
  }, [globalFilter.filterQuery, globalFilter.startDate, globalFilter.endDate, widgetKey]);

  const { data, isLoading } = useFetchCountWidgetData(
    widgetKey,
    filterQueryWithTimeRange,
    groupedBy,
    indexPattern?.title
  );

  const countValue = useMemo((): number => {
    return data ? data?.pages[0] : 0;
  }, [data]);

  const formattedNumber = useMemo((): string => {
    return numberFormatter(countValue);
  }, [countValue]);

  return (
    <div css={styles.container}>
      <div css={styles.title}>
        {title}
        <EuiIconTip
          content={countValue}
          data-test-subj={TOOLTIP_TEST_ID}
          aria-label="Info"
          position="top"
          onMouseOut={() => {}}
        />
      </div>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText css={styles.dataInfo}>
            {isLoading ? (
              <EuiLoadingSpinner size="l" data-test-subj={LOADING_TEST_ID} />
            ) : (
              formattedNumber
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
