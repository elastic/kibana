/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState, useCallback } from 'react';
import useSet from 'react-use/lib/useSet';

import { euiStyled } from '../../../../../../../observability/public';
import {
  LogEntryCategory,
  LogEntryCategoryDataset,
  LogEntryCategoryHistogram,
} from '../../../../../../common/http_api/log_analysis';
import { TimeRange } from '../../../../../../common/http_api/shared';
import { RowExpansionButton } from '../../../../../components/basic_table';
import { AnomalySeverityIndicatorList } from './anomaly_severity_indicator_list';
import { CategoryDetailsRow } from './category_details_row';
import { RegularExpressionRepresentation } from './category_expression';
import { DatasetActionsList } from './datasets_action_list';
import { DatasetsList } from './datasets_list';
import { LogEntryCountSparkline } from './log_entry_count_sparkline';
import { getReferenceCount, getChangeFactor } from './log_entry_count_sparkline';

interface SortOptions {
  field: 'maximumAnomalyScore' | 'logEntryCount' | 'histograms';
  direction: 'asc' | 'desc';
}

export const TopCategoriesTable = euiStyled(
  ({
    categorizationJobId,
    className,
    sourceId,
    timeRange,
    topCategories,
  }: {
    categorizationJobId: string;
    className?: string;
    sourceId: string;
    timeRange: TimeRange;
    topCategories: LogEntryCategory[];
  }) => {
    const [sortOptions, setSortOptions] = useState<SortOptions>({
      field: 'maximumAnomalyScore',
      direction: 'desc',
    });

    const tableSortOptions = useMemo(() => {
      return { sort: sortOptions };
    }, [sortOptions]);

    const handleTableChange = useCallback(
      ({ sort = {} }) => {
        setSortOptions(sort);
      },
      [setSortOptions]
    );

    const sortedCategories = useMemo(() => {
      const { field, direction } = sortOptions;

      if (field === 'maximumAnomalyScore' || field === 'logEntryCount') {
        return topCategories.sort((itemA, itemB) => {
          return direction === 'asc' ? itemA[field] - itemB[field] : itemB[field] - itemA[field];
        });
      } else if (field === 'histograms') {
        // NOTE: "New" items won't have a change factor, so these should be appended or prepended to the list
        const categoriesWithAChangeFactor = topCategories.filter((item) => {
          const changeFactor = getChangeFactor(
            item.logEntryCount,
            getReferenceCount(item.histograms)
          );
          return Number.isFinite(changeFactor);
        });

        const categoriesWithoutAChangeFactor = topCategories.filter((item) => {
          const changeFactor = getChangeFactor(
            item.logEntryCount,
            getReferenceCount(item.histograms)
          );
          return !Number.isFinite(changeFactor);
        });

        const sortedCategoriesWithAChangeFactor = categoriesWithAChangeFactor.sort(
          (itemA, itemB) => {
            const itemAChangeFactor = getChangeFactor(
              itemA.logEntryCount,
              getReferenceCount(itemA.histograms)
            );
            const itemBChangeFactor = getChangeFactor(
              itemB.logEntryCount,
              getReferenceCount(itemB.histograms)
            );
            return direction === 'asc'
              ? itemAChangeFactor - itemBChangeFactor
              : itemBChangeFactor - itemAChangeFactor;
          }
        );

        return direction === 'asc'
          ? [...categoriesWithoutAChangeFactor, ...sortedCategoriesWithAChangeFactor]
          : [...sortedCategoriesWithAChangeFactor, ...categoriesWithoutAChangeFactor];
      } else {
        return topCategories;
      }
    }, [topCategories, sortOptions]);

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
        items={sortedCategories}
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
    sortable: true,
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
