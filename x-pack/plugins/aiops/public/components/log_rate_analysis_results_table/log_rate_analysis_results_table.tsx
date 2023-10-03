/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { orderBy, isEqual } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  useEuiBackgroundColor,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiIcon,
  EuiIconTip,
  EuiTableSortingType,
  EuiToolTip,
} from '@elastic/eui';

import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';

import type { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SignificantTerm } from '@kbn/ml-agg-utils';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';

import { useEuiTheme } from '../../hooks/use_eui_theme';

import { MiniHistogram } from '../mini_histogram';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

import { getFailedTransactionsCorrelationImpactLabel } from './get_failed_transactions_correlation_impact_label';
import { useLogRateAnalysisResultsTableRowContext } from './log_rate_analysis_results_table_row_provider';
import { FieldStatsPopover } from '../field_stats_popover';
import { useCopyToClipboardAction } from './use_copy_to_clipboard_action';
import { useViewInDiscoverAction } from './use_view_in_discover_action';
import { useViewInLogPatternAnalysisAction } from './use_view_in_log_pattern_analysis_action';

const NARROW_COLUMN_WIDTH = '120px';
const ACTIONS_COLUMN_WIDTH = '60px';
const UNIQUE_COLUMN_WIDTH = '40px';
const NOT_AVAILABLE = '--';

const PAGINATION_SIZE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_SORT_FIELD = 'pValue';
const DEFAULT_SORT_DIRECTION = 'asc';

interface LogRateAnalysisResultsTableProps {
  significantTerms: SignificantTerm[];
  dataView: DataView;
  loading: boolean;
  isExpandedRow?: boolean;
  searchQuery: estypes.QueryDslQueryContainer;
  timeRangeMs: TimeRangeMs;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
}

export const LogRateAnalysisResultsTable: FC<LogRateAnalysisResultsTableProps> = ({
  significantTerms,
  dataView,
  loading,
  isExpandedRow,
  searchQuery,
  timeRangeMs,
  barColorOverride,
  barHighlightColorOverride,
}) => {
  const euiTheme = useEuiTheme();
  const primaryBackgroundColor = useEuiBackgroundColor('primary');
  const dataViewId = dataView.id;

  const {
    pinnedSignificantTerm,
    selectedSignificantTerm,
    setPinnedSignificantTerm,
    setSelectedSignificantTerm,
  } = useLogRateAnalysisResultsTableRowContext();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof SignificantTerm>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);

  const { data, uiSettings, fieldFormats, charts } = useAiopsAppContext();

  const fieldStatsServices: FieldStatsServices = useMemo(() => {
    return {
      uiSettings,
      dataViews: data.dataViews,
      data,
      fieldFormats,
      charts,
    };
  }, [uiSettings, data, fieldFormats, charts]);

  const copyToClipBoardAction = useCopyToClipboardAction();
  const viewInDiscoverAction = useViewInDiscoverAction(dataViewId);
  const viewInLogPatternAnalysisAction = useViewInLogPatternAnalysisAction(dataViewId);

  const columns: Array<EuiBasicTableColumn<SignificantTerm>> = [
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnFieldName',
      field: 'fieldName',
      name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.fieldNameLabel', {
        defaultMessage: 'Field name',
      }),
      render: (_, { fieldName, fieldValue }) => (
        <>
          <FieldStatsPopover
            dataView={dataView}
            fieldName={fieldName}
            fieldValue={fieldValue}
            fieldStatsServices={fieldStatsServices}
            dslQuery={searchQuery}
            timeRangeMs={timeRangeMs}
          />
          {fieldName}
        </>
      ),
      sortable: true,
      valign: 'middle',
    },
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnFieldValue',
      field: 'fieldValue',
      name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.fieldValueLabel', {
        defaultMessage: 'Field value',
      }),
      render: (_, { fieldValue }) => String(fieldValue),
      sortable: true,
      textOnly: true,
      valign: 'middle',
    },
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnLogRate',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.logRateColumnTooltip', {
            defaultMessage:
              'A visual representation of the impact of the field on the message rate difference',
          })}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.resultsTable.logRateLabel"
              defaultMessage="Log rate"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (_, { histogram, fieldName, fieldValue }) => (
        <MiniHistogram
          chartData={histogram}
          isLoading={loading && histogram === undefined}
          label={`${fieldName}:${fieldValue}`}
          barColorOverride={barColorOverride}
          barHighlightColorOverride={barHighlightColorOverride}
        />
      ),
      sortable: false,
      valign: 'middle',
    },
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnDocCount',
      width: NARROW_COLUMN_WIDTH,
      field: 'doc_count',
      name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.docCountLabel', {
        defaultMessage: 'Doc count',
      }),
      sortable: true,
      valign: 'middle',
    },
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnPValue',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.pValueColumnTooltip', {
            defaultMessage:
              'The significance of changes in the frequency of values; lower values indicate greater change; sorting this column will automatically do a secondary sort on the doc count column.',
          })}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.resultsTable.pValueLabel"
              defaultMessage="p-value"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (pValue: number | null) => pValue?.toPrecision(3) ?? NOT_AVAILABLE,
      sortable: true,
      valign: 'middle',
    },
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnImpact',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.logRateAnalysis.resultsTable.impactLabelColumnTooltip',
            {
              defaultMessage: 'The level of impact of the field on the message rate difference.',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.resultsTable.impactLabel"
              defaultMessage="Impact"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (_, { pValue }) => {
        if (!pValue) return NOT_AVAILABLE;
        const label = getFailedTransactionsCorrelationImpactLabel(pValue);
        return label ? <EuiBadge color={label.color}>{label.impact}</EuiBadge> : null;
      },
      sortable: true,
      valign: 'middle',
    },
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnAction',
      name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.actionsColumnName', {
        defaultMessage: 'Actions',
      }),
      actions: [
        ...(viewInDiscoverAction ? [viewInDiscoverAction] : []),
        ...(viewInLogPatternAnalysisAction ? [viewInLogPatternAnalysisAction] : []),
        copyToClipBoardAction,
      ],
      width: ACTIONS_COLUMN_WIDTH,
      valign: 'middle',
    },
  ];

  if (isExpandedRow === true) {
    columns.unshift({
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnUnique',
      width: UNIQUE_COLUMN_WIDTH,
      field: 'unique',
      name: '',
      render: (_, { unique }) => {
        if (unique) {
          return (
            <EuiIconTip
              content={i18n.translate(
                'xpack.aiops.logRateAnalysis.resultsTable.uniqueColumnTooltip',
                {
                  defaultMessage: 'This field/value pair only appears in this group',
                }
              )}
              position="top"
              type="asterisk"
            />
          );
        }
        return '';
      },
      sortable: false,
      valign: 'middle',
    });
  }

  const onChange = useCallback((tableSettings) => {
    if (tableSettings.page) {
      const { index, size } = tableSettings.page;
      setPageIndex(index);
      setPageSize(size);
    }

    if (tableSettings.sort) {
      const { field, direction } = tableSettings.sort;
      setSortField(field);
      setSortDirection(direction);
    }
  }, []);

  const { pagination, pageOfItems, sorting } = useMemo(() => {
    const pageStart = pageIndex * pageSize;
    const itemCount = significantTerms?.length ?? 0;

    let items: SignificantTerm[] = significantTerms ?? [];

    const sortIteratees = [
      (item: SignificantTerm) => {
        if (item && typeof item[sortField] === 'string') {
          // @ts-ignore Object is possibly null or undefined
          return item[sortField].toLowerCase();
        }
        return item[sortField];
      },
    ];
    const sortDirections = [sortDirection];

    // Only if the table is sorted by p-value, add a secondary sort by doc count.
    if (sortField === 'pValue') {
      sortIteratees.push((item: SignificantTerm) => item.doc_count);
      sortDirections.push(sortDirection);
    }

    items = orderBy(significantTerms, sortIteratees, sortDirections);

    return {
      pageOfItems: items.slice(pageStart, pageStart + pageSize),
      pagination: {
        pageIndex,
        pageSize,
        totalItemCount: itemCount,
        pageSizeOptions: PAGINATION_SIZE_OPTIONS,
      },
      sorting: {
        sort: {
          field: sortField,
          direction: sortDirection,
        },
      },
    };
  }, [pageIndex, pageSize, sortField, sortDirection, significantTerms]);

  useEffect(() => {
    // If no row is hovered or pinned or the user switched to a new page,
    // fall back to set the first row into a hovered state to make the
    // main document count chart show a comparison view by default.
    if (
      (selectedSignificantTerm === null ||
        !pageOfItems.some((item) => isEqual(item, selectedSignificantTerm))) &&
      pinnedSignificantTerm === null &&
      pageOfItems.length > 0
    ) {
      setSelectedSignificantTerm(pageOfItems[0]);
    }

    // If a user switched pages and a pinned row is no longer visible
    // on the current page, set the status of pinned rows back to `null`.
    if (
      pinnedSignificantTerm !== null &&
      !pageOfItems.some((item) => isEqual(item, pinnedSignificantTerm))
    ) {
      setPinnedSignificantTerm(null);
    }
  }, [
    selectedSignificantTerm,
    setSelectedSignificantTerm,
    setPinnedSignificantTerm,
    pageOfItems,
    pinnedSignificantTerm,
  ]);

  // When the analysis results table unmounts,
  // make sure to reset any hovered or pinned rows.
  useEffect(
    () => () => {
      setSelectedSignificantTerm(null);
      setPinnedSignificantTerm(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const getRowStyle = (significantTerm: SignificantTerm) => {
    if (
      pinnedSignificantTerm &&
      pinnedSignificantTerm.fieldName === significantTerm.fieldName &&
      pinnedSignificantTerm.fieldValue === significantTerm.fieldValue
    ) {
      return {
        backgroundColor: primaryBackgroundColor,
      };
    }

    if (
      selectedSignificantTerm &&
      selectedSignificantTerm.fieldName === significantTerm.fieldName &&
      selectedSignificantTerm.fieldValue === significantTerm.fieldValue
    ) {
      return {
        backgroundColor: euiTheme.euiColorLightestShade,
      };
    }

    return {
      backgroundColor: euiTheme.euiColorEmptyShade,
    };
  };

  // Don't pass on the `loading` state to the table itself because
  // it disables hovering events. Because the mini histograms take a while
  // to load, hovering would not update the main chart. Instead,
  // the loading state is shown by the progress bar on the outer component level.
  // The outer component also will display a prompt when no data was returned
  // running the analysis and will hide this table.

  return (
    <EuiBasicTable
      data-test-subj="aiopsLogRateAnalysisResultsTable"
      compressed
      columns={columns}
      items={pageOfItems}
      onChange={onChange}
      pagination={pagination.totalItemCount > pagination.pageSize ? pagination : undefined}
      loading={false}
      sorting={sorting as EuiTableSortingType<SignificantTerm>}
      rowProps={(significantTerm) => {
        return {
          'data-test-subj': `aiopsLogRateAnalysisResultsTableRow row-${significantTerm.fieldName}-${significantTerm.fieldValue}`,
          onClick: () => {
            if (
              significantTerm.fieldName === pinnedSignificantTerm?.fieldName &&
              significantTerm.fieldValue === pinnedSignificantTerm?.fieldValue
            ) {
              setPinnedSignificantTerm(null);
            } else {
              setPinnedSignificantTerm(significantTerm);
            }
          },
          onMouseEnter: () => {
            if (pinnedSignificantTerm === null) {
              setSelectedSignificantTerm(significantTerm);
            }
          },
          onMouseLeave: () => {
            setSelectedSignificantTerm(null);
          },
          style: getRowStyle(significantTerm),
        };
      }}
    />
  );
};
