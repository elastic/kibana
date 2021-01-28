/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useCallback } from 'react';
import useSet from 'react-use/lib/useSet';

import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import {
  LogEntryCategory,
  LogEntryCategoryDataset,
  LogEntryCategoryHistogram,
} from '../../../../../../common/log_analysis';
import { TimeRange } from '../../../../../../common/time';
import { RowExpansionButton } from '../../../../../components/basic_table';
import { AnomalySeverityIndicatorList } from './anomaly_severity_indicator_list';
import { CategoryDetailsRow } from './category_details_row';
import { RegularExpressionRepresentation } from '../../../../../components/logging/log_analysis_results/category_expression';
import { DatasetActionsList } from './datasets_action_list';
import { DatasetsList } from './datasets_list';
import { LogEntryCountSparkline } from './log_entry_count_sparkline';
import { SortOptions, ChangeSortOptions } from '../../use_log_entry_categories_results';

export const TopCategoriesTable = euiStyled(
  ({
    categorizationJobId,
    className,
    sourceId,
    timeRange,
    topCategories,
    sortOptions,
    changeSortOptions,
  }: {
    categorizationJobId: string;
    className?: string;
    sourceId: string;
    timeRange: TimeRange;
    topCategories: LogEntryCategory[];
    sortOptions: SortOptions;
    changeSortOptions: ChangeSortOptions;
  }) => {
    const tableSortOptions = useMemo(() => {
      return { sort: sortOptions };
    }, [sortOptions]);

    const handleTableChange = useCallback(
      ({ sort = {} }) => {
        changeSortOptions(sort);
      },
      [changeSortOptions]
    );

    const [expandedCategories, { add: expandCategory, remove: collapseCategory }] = useSet<number>(
      new Set()
    );

    const columns = useMemo(
      () =>
        createColumns(
          timeRange,
          categorizationJobId,
          expandedCategories,
          expandCategory,
          collapseCategory
        ),
      [categorizationJobId, collapseCategory, expandCategory, expandedCategories, timeRange]
    );

    const expandedRowContentsById = useMemo(
      () =>
        [...expandedCategories].reduce<Record<number, React.ReactNode>>(
          (aggregatedCategoryRows, categoryId) => ({
            ...aggregatedCategoryRows,
            [categoryId]: (
              <CategoryDetailsRow
                categoryId={categoryId}
                sourceId={sourceId}
                timeRange={timeRange}
              />
            ),
          }),
          {}
        ),
      [expandedCategories, sourceId, timeRange]
    );

    return (
      <EuiBasicTable
        columns={columns}
        itemIdToExpandedRowMap={expandedRowContentsById}
        itemId="categoryId"
        items={topCategories}
        rowProps={{ className: `${className} euiTableRow--topAligned` }}
        onChange={handleTableChange}
        sorting={tableSortOptions}
      />
    );
  }
)`
  &.euiTableRow--topAligned .euiTableRowCell {
    vertical-align: top;
  }
`;

const createColumns = (
  timeRange: TimeRange,
  categorizationJobId: string,
  expandedCategories: Set<number>,
  expandCategory: (categoryId: number) => void,
  collapseCategory: (categoryId: number) => void
): Array<EuiBasicTableColumn<LogEntryCategory>> => [
  {
    align: 'right',
    field: 'logEntryCount',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.countColumnTitle', {
      defaultMessage: 'Message count',
    }),
    sortable: true,
    render: (logEntryCount: number) => {
      return numeral(logEntryCount).format('0,0');
    },
    width: '120px',
  },
  {
    field: 'histograms',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.trendColumnTitle', {
      defaultMessage: 'Trend',
    }),
    render: (histograms: LogEntryCategoryHistogram[], item) => {
      return (
        <LogEntryCountSparkline
          currentCount={item.logEntryCount}
          histograms={histograms}
          timeRange={timeRange}
        />
      );
    },
    width: '220px',
  },
  {
    field: 'regularExpression',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.categoryColumnTitle', {
      defaultMessage: 'Category',
    }),
    truncateText: true,
    render: (regularExpression: string) => (
      <RegularExpressionRepresentation regularExpression={regularExpression} />
    ),
  },
  {
    field: 'datasets',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.datasetColumnTitle', {
      defaultMessage: 'Datasets',
    }),
    render: (datasets: LogEntryCategoryDataset[]) => <DatasetsList datasets={datasets} />,
    width: '200px',
  },
  {
    align: 'right',
    field: 'maximumAnomalyScore',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.maximumAnomalyScoreColumnTitle', {
      defaultMessage: 'Maximum anomaly score',
    }),
    sortable: true,
    render: (_maximumAnomalyScore: number, item) => (
      <AnomalySeverityIndicatorList datasets={item.datasets} />
    ),
    width: '160px',
  },
  {
    actions: [
      {
        render: (category) => (
          <DatasetActionsList
            categorizationJobId={categorizationJobId}
            categoryId={category.categoryId}
            datasets={category.datasets}
            timeRange={timeRange}
          />
        ),
      },
    ],
    width: '40px',
  },

  {
    align: 'right',
    isExpander: true,
    render: (item: LogEntryCategory) => {
      return (
        <RowExpansionButton
          isExpanded={expandedCategories.has(item.categoryId)}
          item={item.categoryId}
          onCollapse={collapseCategory}
          onExpand={expandCategory}
        />
      );
    },
    width: '40px',
  },
];
