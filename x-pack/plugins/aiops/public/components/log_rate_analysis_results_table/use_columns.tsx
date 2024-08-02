/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  type EuiBasicTableColumn,
  EuiBadge,
  EuiCode,
  EuiIcon,
  EuiIconTip,
  EuiText,
} from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { type SignificantItem, SIGNIFICANT_ITEM_TYPE } from '@kbn/ml-agg-utils';
import { getCategoryQuery } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import { useAppSelector } from '@kbn/aiops-log-rate-analysis/state';
import {
  getBaselineAndDeviationRates,
  getLogRateChange,
  LOG_RATE_ANALYSIS_TYPE,
} from '@kbn/aiops-log-rate-analysis';
import { getFailedTransactionsCorrelationImpactLabel } from './get_failed_transactions_correlation_impact_label';
import { FieldStatsPopover } from '../field_stats_popover';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useDataSource } from '../../hooks/use_data_source';
import { useEuiTheme } from '../../hooks/use_eui_theme';
import { useViewInDiscoverAction } from './use_view_in_discover_action';
import { useViewInLogPatternAnalysisAction } from './use_view_in_log_pattern_analysis_action';
import { useCopyToClipboardAction } from './use_copy_to_clipboard_action';
import { MiniHistogram } from '../mini_histogram';

const TRUNCATE_TEXT_LINES = 3;
const UNIQUE_COLUMN_WIDTH = '40px';
const NOT_AVAILABLE = '--';

export const commonColumns = {
  ['Log rate']: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.logRateColumnTitle', {
    defaultMessage: 'Log rate',
  }),
  ['Doc count']: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.docCountColumnTitle', {
    defaultMessage: 'Doc count',
  }),
  ['p-value']: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.pValueColumnTitle', {
    defaultMessage: 'p-value',
  }),
  ['Impact']: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.impactColumnTitle', {
    defaultMessage: 'Impact',
  }),
  ['Baseline rate']: i18n.translate(
    'xpack.aiops.logRateAnalysis.resultsTable.baselineRateColumnTitle',
    {
      defaultMessage: 'Baseline rate',
    }
  ),
  ['Deviation rate']: i18n.translate(
    'xpack.aiops.logRateAnalysis.resultsTable.deviationRateColumnTitle',
    {
      defaultMessage: 'Deviation rate',
    }
  ),
  ['Log rate change']: i18n.translate(
    'xpack.aiops.logRateAnalysis.resultsTable.logRateChangeColumnTitle',
    {
      defaultMessage: 'Log rate change',
    }
  ),
  ['Actions']: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.actionsColumnTitle', {
    defaultMessage: 'Actions',
  }),
};

export const significantItemColumns = {
  ['Field name']: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.fieldNameColumnTitle', {
    defaultMessage: 'Field name',
  }),
  ['Field value']: i18n.translate(
    'xpack.aiops.logRateAnalysis.resultsTable.fieldValueColumnTitle',
    {
      defaultMessage: 'Field value',
    }
  ),
  ...commonColumns,
} as const;

export const LOG_RATE_ANALYSIS_RESULTS_TABLE_TYPE = {
  GROUPS: 'groups',
  SIGNIFICANT_ITEMS: 'significantItems',
} as const;
export type LogRateAnalysisResultsTableType =
  (typeof LOG_RATE_ANALYSIS_RESULTS_TABLE_TYPE)[keyof typeof LOG_RATE_ANALYSIS_RESULTS_TABLE_TYPE];

export type ColumnNames = keyof typeof significantItemColumns | 'unique';

const logRateHelpMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.logRateColumnTooltip',
  {
    defaultMessage:
      'A visual representation of the impact of the field on the message rate difference',
  }
);
const groupLogRateHelpMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateColumnTooltip',
  {
    defaultMessage:
      'A visual representation of the impact of the group on the message rate difference.',
  }
);
const groupImpactMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTableGroups.impactLabelColumnTooltip',
  {
    defaultMessage: 'The level of impact of the group on the message rate difference',
  }
);
const impactMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTable.impactLabelColumnTooltip',
  {
    defaultMessage: 'The level of impact of the field on the message rate difference.',
  }
);
const logRateChangeMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateChangeLabelColumnTooltip',
  {
    defaultMessage:
      'The factor by which the log rate changed. This value is normalized to account for differing lengths in baseline and deviation time ranges.',
  }
);
const baselineRateMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTableGroups.baselineRateLabelColumnTooltip',
  {
    defaultMessage: 'The average number of documents per baseline bucket.',
  }
);
const deviationRateMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.resultsTableGroups.deviationRateLabelColumnTooltip',
  {
    defaultMessage: 'The average number of documents per deviation bucket.',
  }
);

export const useColumns = (
  tableType: LogRateAnalysisResultsTableType,
  skippedColumns: string[],
  searchQuery: estypes.QueryDslQueryContainer,
  barColorOverride?: string,
  barHighlightColorOverride?: string,
  isExpandedRow: boolean = false
): Array<EuiBasicTableColumn<SignificantItem>> => {
  const { data, uiSettings, fieldFormats, charts } = useAiopsAppContext();
  const { dataView } = useDataSource();
  const euiTheme = useEuiTheme();
  const viewInDiscoverAction = useViewInDiscoverAction(dataView.id);
  const viewInLogPatternAnalysisAction = useViewInLogPatternAnalysisAction(dataView.id);
  const copyToClipBoardAction = useCopyToClipboardAction();

  const { earliest, latest } = useAppSelector((s) => s.logRateAnalysis);
  const timeRangeMs = { from: earliest ?? 0, to: latest ?? 0 };

  const loading = useAppSelector((s) => s.logRateAnalysisStream.isRunning);
  const zeroDocsFallback = useAppSelector((s) => s.logRateAnalysisResults.zeroDocsFallback);
  const {
    documentStats: { documentCountStats },
  } = useAppSelector((s) => s.logRateAnalysis);
  const { currentAnalysisType, currentAnalysisWindowParameters } = useAppSelector(
    (s) => s.logRateAnalysisResults
  );

  const isGroupsTable = tableType === LOG_RATE_ANALYSIS_RESULTS_TABLE_TYPE.GROUPS;
  const interval = documentCountStats?.interval ?? 0;

  const fieldStatsServices: FieldStatsServices = useMemo(() => {
    return {
      uiSettings,
      dataViews: data.dataViews,
      data,
      fieldFormats,
      charts,
    };
  }, [uiSettings, data, fieldFormats, charts]);

  const buckets = useMemo(() => {
    if (currentAnalysisWindowParameters === undefined) return;

    const { baselineMin, baselineMax, deviationMin, deviationMax } =
      currentAnalysisWindowParameters;
    const baselineBuckets = (baselineMax - baselineMin) / interval;
    const deviationBuckets = (deviationMax - deviationMin) / interval;

    return { baselineBuckets, deviationBuckets };
  }, [currentAnalysisWindowParameters, interval]);

  const columnsMap: Record<ColumnNames, EuiBasicTableColumn<SignificantItem>> = useMemo(
    () => ({
      ['Field name']: {
        'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnFieldName',
        field: 'fieldName',
        width: skippedColumns.length < 3 ? '17%' : '25%',
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
                <span
                  // match the margins of the FieldStatsPopover button
                  css={{
                    marginLeft: euiTheme.euiSizeS,
                    marginRight: euiTheme.euiSizeXS,
                  }}
                >
                  <EuiIconTip
                    type="aggregate"
                    data-test-subj={'aiopsLogPatternIcon'}
                    size="m"
                    content={i18n.translate(
                      'xpack.aiops.fieldContextPopover.descriptionTooltipLogPattern',
                      {
                        defaultMessage:
                          'The field value for this field shows an example of the identified significant text field pattern.',
                      }
                    )}
                  />
                </span>
              )}

              <span title={fieldName} className="eui-textTruncate">
                {fieldName}
              </span>
            </>
          );
        },
        sortable: true,
        valign: 'middle',
      },
      ['Field value']: {
        'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnFieldValue',
        field: 'fieldValue',
        width: skippedColumns.length < 3 ? '17%' : '25%',
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
      ['Log rate']: {
        'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnLogRate',
        width: '8%',
        field: 'pValue',
        name: (
          <>
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.resultsTable.logRateLabel"
              defaultMessage="Log rate"
            />
            &nbsp;
            <EuiIconTip
              size="s"
              position="top"
              color="subdued"
              type="questionInCircle"
              className="eui-alignTop"
              content={isGroupsTable ? groupLogRateHelpMessage : logRateHelpMessage}
            />
          </>
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
      ['Impact']: {
        'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnImpact',
        width: '8%',
        field: 'pValue',
        name: (
          <>
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.resultsTable.impactLabel"
              defaultMessage="Impact"
            />
            &nbsp;
            <EuiIconTip
              size="s"
              position="top"
              color="subdued"
              type="questionInCircle"
              className="eui-alignTop"
              content={isGroupsTable ? groupImpactMessage : impactMessage}
            />
          </>
        ),
        render: (_, { pValue }) => {
          if (typeof pValue !== 'number') return NOT_AVAILABLE;
          const label = getFailedTransactionsCorrelationImpactLabel(pValue);
          return label ? <EuiBadge color={label.color}>{label.impact}</EuiBadge> : null;
        },
        sortable: true,
        valign: 'middle',
      },
      ['Baseline rate']: {
        'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnBaselineRateChange',
        field: 'bg_count',
        name: (
          <>
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.resultsTable.baselineRateLabel"
              defaultMessage="Baseline rate"
            />
            &nbsp;
            <EuiIconTip
              size="s"
              position="top"
              color="subdued"
              type="questionInCircle"
              className="eui-alignTop"
              content={baselineRateMessage}
            />
          </>
        ),
        render: (_, { bg_count: bgCount, doc_count: docCount }) => {
          if (
            interval === 0 ||
            currentAnalysisType === undefined ||
            currentAnalysisWindowParameters === undefined ||
            buckets === undefined ||
            isGroupsTable
          )
            return NOT_AVAILABLE;

          const { baselineBucketRate } = getBaselineAndDeviationRates(
            currentAnalysisType,
            buckets.baselineBuckets,
            buckets.deviationBuckets,
            docCount,
            bgCount
          );

          return <>{baselineBucketRate}</>;
        },
        sortable: true,
        valign: 'middle',
      },
      ['Deviation rate']: {
        'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnDeviationRateChange',
        field: 'doc_count',
        name: (
          <>
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.resultsTable.deviationRateLabel"
              defaultMessage="Deviation rate"
            />
            &nbsp;
            <EuiIconTip
              size="s"
              position="top"
              color="subdued"
              type="questionInCircle"
              className="eui-alignTop"
              content={deviationRateMessage}
            />
          </>
        ),
        render: (_, { doc_count: docCount, bg_count: bgCount }) => {
          if (
            interval === 0 ||
            currentAnalysisType === undefined ||
            currentAnalysisWindowParameters === undefined ||
            buckets === undefined ||
            isGroupsTable
          )
            return NOT_AVAILABLE;

          const { deviationBucketRate } = getBaselineAndDeviationRates(
            currentAnalysisType,
            buckets.baselineBuckets,
            buckets.deviationBuckets,
            docCount,
            bgCount
          );

          return <>{deviationBucketRate}</>;
        },
        sortable: true,
        valign: 'middle',
      },
      ['Log rate change']: {
        'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnLogRateChange',
        name: (
          <>
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.resultsTable.logRateChangeLabel"
              defaultMessage="Log rate change"
            />
            &nbsp;
            <EuiIconTip
              size="s"
              position="top"
              color="subdued"
              type="questionInCircle"
              className="eui-alignTop"
              content={logRateChangeMessage}
            />
          </>
        ),
        render: ({ doc_count: docCount, bg_count: bgCount }: SignificantItem) => {
          if (
            interval === 0 ||
            currentAnalysisType === undefined ||
            currentAnalysisWindowParameters === undefined ||
            buckets === undefined ||
            isGroupsTable
          )
            return NOT_AVAILABLE;

          const { baselineBucketRate, deviationBucketRate } = getBaselineAndDeviationRates(
            currentAnalysisType,
            buckets.baselineBuckets,
            buckets.deviationBuckets,
            docCount,
            bgCount
          );

          const logRateChange = getLogRateChange(
            currentAnalysisType,
            baselineBucketRate,
            deviationBucketRate
          );

          return (
            <>
              <EuiIcon
                size="s"
                color="subdued"
                type={currentAnalysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE ? 'sortUp' : 'sortDown'}
                className="eui-alignTop"
              />
              &nbsp;
              {logRateChange.message}
            </>
          );
        },
        valign: 'middle',
      },
      ['p-value']: {
        'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnPValue',
        field: 'pValue',
        name: (
          <>
            <FormattedMessage
              id="xpack.aiops.logRateAnalysis.resultsTable.pValueLabel"
              defaultMessage="p-value"
            />
            &nbsp;
            <EuiIconTip
              size="s"
              position="top"
              color="subdued"
              type="questionInCircle"
              className="eui-alignTop"
              content={i18n.translate(
                'xpack.aiops.logRateAnalysis.resultsTable.pValueColumnTooltip',
                {
                  defaultMessage:
                    'The significance of changes in the frequency of values; lower values indicate greater change; sorting this column will automatically do a secondary sort on the doc count column.',
                }
              )}
            />
          </>
        ),
        render: (pValue: number | null) => pValue?.toPrecision(3) ?? NOT_AVAILABLE,
        sortable: true,
        valign: 'middle',
      },
      ['Doc count']: {
        'data-test-subj': isGroupsTable
          ? 'aiopsLogRateAnalysisResultsGroupsTableColumnDocCount'
          : 'aiopsLogRateAnalysisResultsTableColumnDocCount',
        width: '8%',
        field: isGroupsTable ? 'docCount' : 'doc_count',
        name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.docCountLabel', {
          defaultMessage: 'Doc count',
        }),
        sortable: true,
        valign: 'middle',
      },
      ['Actions']: {
        'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnAction',
        name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.actionsColumnName', {
          defaultMessage: 'Actions',
        }),
        actions: [
          ...(viewInDiscoverAction ? [viewInDiscoverAction] : []),
          ...(viewInLogPatternAnalysisAction ? [viewInLogPatternAnalysisAction] : []),
          copyToClipBoardAction,
        ],
        width: '4%',
        valign: 'middle',
      },
      unique: {
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
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      barColorOverride,
      barHighlightColorOverride,
      copyToClipBoardAction,
      dataView?.id,
      euiTheme,
      fieldStatsServices,
      loading,
      searchQuery,
      timeRangeMs,
      viewInDiscoverAction,
      viewInLogPatternAnalysisAction,
    ]
  );

  const columns = useMemo(() => {
    const columnNamesToReturn: Partial<Record<ColumnNames, string>> = isGroupsTable
      ? commonColumns
      : significantItemColumns;
    const columnsToReturn = [];

    for (const columnName in columnNamesToReturn) {
      if (
        columnNamesToReturn.hasOwnProperty(columnName) === false ||
        skippedColumns.includes(columnNamesToReturn[columnName as ColumnNames] as string) ||
        ((columnName === 'p-value' || columnName === 'Impact') && zeroDocsFallback)
      )
        continue;

      columnsToReturn.push(columnsMap[columnName as ColumnNames]);
    }

    if (isExpandedRow === true) {
      columnsToReturn.unshift(columnsMap.unique);
    }

    return columnsToReturn;
  }, [isGroupsTable, skippedColumns, zeroDocsFallback, isExpandedRow, columnsMap]);

  return columns;
};
