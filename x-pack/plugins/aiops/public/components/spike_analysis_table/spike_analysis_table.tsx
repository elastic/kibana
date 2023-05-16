/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import { sortBy } from 'lodash';
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

import { FieldStatsServices } from '@kbn/unified-field-list-plugin/public';

import type { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SignificantTerm } from '@kbn/ml-agg-utils';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';

import { useEuiTheme } from '../../hooks/use_eui_theme';

import { MiniHistogram } from '../mini_histogram';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

import { getFailedTransactionsCorrelationImpactLabel } from './get_failed_transactions_correlation_impact_label';
import { useSpikeAnalysisTableRowContext } from './spike_analysis_table_row_provider';
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

interface SpikeAnalysisTableProps {
  significantTerms: SignificantTerm[];
  dataView: DataView;
  loading: boolean;
  isExpandedRow?: boolean;
  searchQuery: estypes.QueryDslQueryContainer;
  timeRangeMs: TimeRangeMs;
}

export const SpikeAnalysisTable: FC<SpikeAnalysisTableProps> = ({
  significantTerms,
  dataView,
  loading,
  isExpandedRow,
  searchQuery,
  timeRangeMs,
}) => {
  const euiTheme = useEuiTheme();
  const primaryBackgroundColor = useEuiBackgroundColor('primary');
  const dataViewId = dataView.id;

  const {
    pinnedSignificantTerm,
    selectedSignificantTerm,
    setPinnedSignificantTerm,
    setSelectedSignificantTerm,
  } = useSpikeAnalysisTableRowContext();

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
      'data-test-subj': 'aiopsSpikeAnalysisTableColumnFieldName',
      field: 'fieldName',
      name: i18n.translate('xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.fieldNameLabel', {
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
      'data-test-subj': 'aiopsSpikeAnalysisTableColumnFieldValue',
      field: 'fieldValue',
      name: i18n.translate('xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.fieldValueLabel', {
        defaultMessage: 'Field value',
      }),
      render: (_, { fieldValue }) => String(fieldValue),
      sortable: true,
      textOnly: true,
      valign: 'middle',
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisTableColumnLogRate',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.logRateColumnTooltip',
            {
              defaultMessage:
                'A visual representation of the impact of the field on the message rate difference',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.logRateLabel"
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
        />
      ),
      sortable: false,
      valign: 'middle',
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisTableColumnDocCount',
      width: NARROW_COLUMN_WIDTH,
      field: 'doc_count',
      name: i18n.translate('xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.docCountLabel', {
        defaultMessage: 'Doc count',
      }),
      sortable: true,
      valign: 'middle',
    },
    {
      'data-test-subj': 'aiopsSpikeAnalysisTableColumnPValue',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.pValueColumnTooltip',
            {
              defaultMessage:
                'The significance of changes in the frequency of values; lower values indicate greater change',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.pValueLabel"
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
      'data-test-subj': 'aiopsSpikeAnalysisTableColumnImpact',
      width: NARROW_COLUMN_WIDTH,
      field: 'pValue',
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.impactLabelColumnTooltip',
            {
              defaultMessage: 'The level of impact of the field on the message rate difference.',
            }
          )}
        >
          <>
            <FormattedMessage
              id="xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.impactLabel"
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
      'data-test-subj': 'aiOpsSpikeAnalysisTableColumnAction',
      name: i18n.translate('xpack.aiops.spikeAnalysisTable.actionsColumnName', {
        defaultMessage: 'Actions',
      }),
      actions: [viewInDiscoverAction, viewInLogPatternAnalysisAction, copyToClipBoardAction],
      width: ACTIONS_COLUMN_WIDTH,
      valign: 'middle',
    },
  ];

  if (isExpandedRow === true) {
    columns.unshift({
      'data-test-subj': 'aiopsSpikeAnalysisTableColumnUnique',
      width: UNIQUE_COLUMN_WIDTH,
      field: 'unique',
      name: '',
      render: (_, { unique }) => {
        if (unique) {
          return (
            <EuiIconTip
              content={i18n.translate(
                'xpack.aiops.explainLogRateSpikes.spikeAnalysisTable.uniqueColumnTooltip',
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
    const { index, size } = tableSettings.page;
    const { field, direction } = tableSettings.sort;

    setPageIndex(index);
    setPageSize(size);
    setSortField(field);
    setSortDirection(direction);
  }, []);

  const { pagination, pageOfItems, sorting } = useMemo(() => {
    const pageStart = pageIndex * pageSize;
    const itemCount = significantTerms?.length ?? 0;

    let items: SignificantTerm[] = significantTerms ?? [];
    items = sortBy(significantTerms, (item) => {
      if (item && typeof item[sortField] === 'string') {
        // @ts-ignore Object is possibly null or undefined
        return item[sortField].toLowerCase();
      }
      return item[sortField];
    });
    items = sortDirection === 'asc' ? items : items.reverse();

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
      data-test-subj="aiopsSpikeAnalysisTable"
      compressed
      columns={columns}
      items={pageOfItems}
      onChange={onChange}
      pagination={pagination.totalItemCount > pagination.pageSize ? pagination : undefined}
      loading={false}
      sorting={sorting as EuiTableSortingType<SignificantTerm>}
      rowProps={(significantTerm) => {
        return {
          'data-test-subj': `aiopsSpikeAnalysisTableRow row-${significantTerm.fieldName}-${significantTerm.fieldValue}`,
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
            setSelectedSignificantTerm(significantTerm);
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
