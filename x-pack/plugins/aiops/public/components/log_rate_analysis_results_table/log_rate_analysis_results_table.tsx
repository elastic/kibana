/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { orderBy, isEqual } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { EuiBasicTableColumn, EuiTableSortingType } from '@elastic/eui';
import {
  useEuiBackgroundColor,
  EuiBadge,
  EuiBasicTable,
  EuiCode,
  EuiIcon,
  EuiIconTip,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';

import type { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { type SignificantItem, SIGNIFICANT_ITEM_TYPE } from '@kbn/ml-agg-utils';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';

import { getCategoryQuery } from '../../../common/api/log_categorization/get_category_query';

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
const DEFAULT_SORT_FIELD_ZERO_DOCS_FALLBACK = 'doc_count';
const DEFAULT_SORT_DIRECTION = 'asc';
const DEFAULT_SORT_DIRECTION_ZERO_DOCS_FALLBACK = 'desc';

const TRUNCATE_TEXT_LINES = 3;

interface LogRateAnalysisResultsTableProps {
  significantItems: SignificantItem[];
  dataView: DataView;
  loading: boolean;
  isExpandedRow?: boolean;
  searchQuery: estypes.QueryDslQueryContainer;
  timeRangeMs: TimeRangeMs;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  zeroDocsFallback?: boolean;
}

export const LogRateAnalysisResultsTable: FC<LogRateAnalysisResultsTableProps> = ({
  significantItems,
  dataView,
  loading,
  isExpandedRow,
  searchQuery,
  timeRangeMs,
  barColorOverride,
  barHighlightColorOverride,
  zeroDocsFallback = false,
}) => {
  const euiTheme = useEuiTheme();
  const primaryBackgroundColor = useEuiBackgroundColor('primary');
  const dataViewId = dataView.id;

  const {
    pinnedGroup,
    pinnedSignificantItem,
    selectedGroup,
    selectedSignificantItem,
    setPinnedSignificantItem,
    setSelectedSignificantItem,
  } = useLogRateAnalysisResultsTableRowContext();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof SignificantItem>(
    zeroDocsFallback ? DEFAULT_SORT_FIELD_ZERO_DOCS_FALLBACK : DEFAULT_SORT_FIELD
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    zeroDocsFallback ? DEFAULT_SORT_DIRECTION_ZERO_DOCS_FALLBACK : DEFAULT_SORT_DIRECTION
  );

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

  const columns: Array<EuiBasicTableColumn<SignificantItem>> = [
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnFieldName',
      field: 'fieldName',
      name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.fieldNameLabel', {
        defaultMessage: 'Field name',
      }),
      render: (_, { fieldName, fieldValue, key, type, doc_count: count }) => {
        const dslQuery =
          type === SIGNIFICANT_ITEM_TYPE.KEYWORD
            ? searchQuery
            : getCategoryQuery(fieldName, [
                {
                  key,
                  count,
                  examples: [],
                  regex: '',
                },
              ]);
        return (
          <>
            {type === SIGNIFICANT_ITEM_TYPE.KEYWORD && (
              <FieldStatsPopover
                dataView={dataView}
                fieldName={fieldName}
                fieldValue={type === SIGNIFICANT_ITEM_TYPE.KEYWORD ? fieldValue : key}
                fieldStatsServices={fieldStatsServices}
                dslQuery={dslQuery}
                timeRangeMs={timeRangeMs}
              />
            )}
            {type === SIGNIFICANT_ITEM_TYPE.LOG_PATTERN && (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.aiops.fieldContextPopover.descriptionTooltipLogPattern',
                  {
                    defaultMessage:
                      'The field value for this field shows an example of the identified significant text field pattern.',
                  }
                )}
              >
                <EuiIcon
                  type="aggregate"
                  data-test-subj={'aiopsLogPatternIcon'}
                  css={{ marginLeft: euiTheme.euiSizeS, marginRight: euiTheme.euiSizeXS }}
                  size="m"
                />
              </EuiToolTip>
            )}

            <span title={fieldName}>{fieldName}</span>
          </>
        );
      },
      sortable: true,
      truncateText: true,
      valign: 'middle',
    },
    {
      'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnFieldValue',
      field: 'fieldValue',
      name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.fieldValueLabel', {
        defaultMessage: 'Field value',
      }),
      render: (_, { fieldValue, type }) => (
        <span title={String(fieldValue)}>
          {type === 'keyword' ? (
            String(fieldValue)
          ) : (
            <EuiText size="xs">
              <EuiCode language="log" transparentBackground css={{ paddingInline: '0px' }}>
                {String(fieldValue)}
              </EuiCode>
            </EuiText>
          )}
        </span>
      ),
      sortable: true,
      textOnly: true,
      truncateText: { lines: TRUNCATE_TEXT_LINES },
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
  ];

  if (!zeroDocsFallback) {
    columns.push({
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
    });

    columns.push({
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
        if (typeof pValue !== 'number') return NOT_AVAILABLE;
        const label = getFailedTransactionsCorrelationImpactLabel(pValue);
        return label ? <EuiBadge color={label.color}>{label.impact}</EuiBadge> : null;
      },
      sortable: true,
      valign: 'middle',
    });
  }

  columns.push({
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
  });

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
    const itemCount = significantItems?.length ?? 0;

    let items: SignificantItem[] = significantItems ?? [];

    const sortIteratees = [
      (item: SignificantItem) => {
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
      sortIteratees.push((item: SignificantItem) => item.doc_count);
      sortDirections.push(sortDirection);
    }

    items = orderBy(significantItems, sortIteratees, sortDirections);

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
  }, [pageIndex, pageSize, sortField, sortDirection, significantItems]);

  useEffect(() => {
    // If no row is hovered or pinned or the user switched to a new page,
    // fall back to set the first row into a hovered state to make the
    // main document count chart show a comparison view by default.
    if (
      (selectedSignificantItem === null ||
        !pageOfItems.some((item) => isEqual(item, selectedSignificantItem))) &&
      pinnedSignificantItem === null &&
      pageOfItems.length > 0 &&
      selectedGroup === null &&
      pinnedGroup === null
    ) {
      setSelectedSignificantItem(pageOfItems[0]);
    }

    // If a user switched pages and a pinned row is no longer visible
    // on the current page, set the status of pinned rows back to `null`.
    if (
      pinnedSignificantItem !== null &&
      !pageOfItems.some((item) => isEqual(item, pinnedSignificantItem)) &&
      selectedGroup === null &&
      pinnedGroup === null
    ) {
      setPinnedSignificantItem(null);
    }
  }, [
    selectedGroup,
    selectedSignificantItem,
    setSelectedSignificantItem,
    setPinnedSignificantItem,
    pageOfItems,
    pinnedGroup,
    pinnedSignificantItem,
  ]);

  // When the analysis results table unmounts,
  // make sure to reset any hovered or pinned rows.
  useEffect(
    () => () => {
      setSelectedSignificantItem(null);
      setPinnedSignificantItem(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const getRowStyle = (significantItem: SignificantItem) => {
    if (
      pinnedSignificantItem &&
      pinnedSignificantItem.fieldName === significantItem.fieldName &&
      pinnedSignificantItem.fieldValue === significantItem.fieldValue
    ) {
      return {
        backgroundColor: primaryBackgroundColor,
      };
    }

    if (
      selectedSignificantItem &&
      selectedSignificantItem.fieldName === significantItem.fieldName &&
      selectedSignificantItem.fieldValue === significantItem.fieldValue
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
      sorting={sorting as EuiTableSortingType<SignificantItem>}
      rowProps={(significantItem) => {
        return {
          'data-test-subj': `aiopsLogRateAnalysisResultsTableRow row-${significantItem.fieldName}-${significantItem.fieldValue}`,
          onClick: () => {
            if (
              significantItem.fieldName === pinnedSignificantItem?.fieldName &&
              significantItem.fieldValue === pinnedSignificantItem?.fieldValue
            ) {
              setPinnedSignificantItem(null);
            } else {
              setPinnedSignificantItem(significantItem);
            }
          },
          onMouseEnter: () => {
            if (pinnedSignificantItem === null) {
              setSelectedSignificantItem(significantItem);
            }
          },
          onMouseLeave: () => {
            setSelectedSignificantItem(null);
          },
          style: getRowStyle(significantItem),
        };
      }}
    />
  );
};
