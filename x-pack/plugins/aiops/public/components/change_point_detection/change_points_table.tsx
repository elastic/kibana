/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  type EuiBasicTableColumn,
  EuiEmptyPrompt,
  EuiIcon,
  EuiInMemoryTable,
  EuiToolTip,
  type DefaultItemAction,
} from '@elastic/eui';
import React, { type FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
import { type Filter, FilterStateStore } from '@kbn/es-query';
import { useDataSource } from '../../hooks/use_data_source';
import { useCommonChartProps } from './use_common_chart_props';
import {
  type ChangePointAnnotation,
  FieldConfig,
  SelectedChangePoint,
} from './change_point_detection_context';
import { type ChartComponentProps } from './chart_component';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

export interface ChangePointsTableProps {
  annotations: ChangePointAnnotation[];
  fieldConfig: FieldConfig;
  isLoading: boolean;
  onSelectionChange: (update: SelectedChangePoint[]) => void;
}

function getFilterConfig(
  index: string,
  item: Required<ChangePointAnnotation>,
  negate: boolean
): Filter {
  return {
    meta: {
      disabled: false,
      negate,
      alias: null,
      index,
      key: `${item.group.name}_${item.group.value}`,
      // @ts-ignore FilterMeta type definition misses the field property
      field: item.group.name,
      params: {
        query: item.group.value,
      },
      type: 'phrase',
    },
    query: {
      match_phrase: {
        [item.group.name]: item.group.value,
      },
    },
    $state: {
      store: FilterStateStore.APP_STATE,
    },
  };
}

export const ChangePointsTable: FC<ChangePointsTableProps> = ({
  isLoading,
  annotations,
  fieldConfig,
  onSelectionChange,
}) => {
  const {
    fieldFormats,
    data: {
      query: { filterManager },
    },
  } = useAiopsAppContext();
  const { dataView } = useDataSource();

  const dateFormatter = useMemo(() => fieldFormats.deserialize({ id: 'date' }), [fieldFormats]);

  const defaultSorting = {
    sort: {
      field: 'p_value',
      // Lower p_value indicates a bigger change point, hence the asc sorting
      direction: 'asc' as const,
    },
  };

  const hasActions = fieldConfig.splitField !== undefined;

  const columns: Array<EuiBasicTableColumn<ChangePointAnnotation>> = [
    {
      id: 'timestamp',
      field: 'timestamp',
      'data-test-subj': 'aiopsChangePointTimestamp',
      name: i18n.translate('xpack.aiops.changePointDetection.timeColumn', {
        defaultMessage: 'Time',
      }),
      sortable: true,
      truncateText: false,
      width: '230px',
      render: (timestamp: ChangePointAnnotation['timestamp']) => dateFormatter.convert(timestamp),
    },
    {
      id: 'preview',
      'data-test-subj': 'aiopsChangePointPreview',
      name: i18n.translate('xpack.aiops.changePointDetection.previewColumn', {
        defaultMessage: 'Preview',
      }),
      align: 'center',
      width: '200px',
      height: '80px',
      truncateText: false,
      valign: 'middle',
      css: { display: 'block', padding: 0 },
      render: (annotation: ChangePointAnnotation) => {
        return <MiniChartPreview annotation={annotation} fieldConfig={fieldConfig} />;
      },
    },
    {
      id: 'type',
      'data-test-subj': 'aiopsChangePointType',
      field: 'type',
      name: i18n.translate('xpack.aiops.changePointDetection.typeColumn', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      truncateText: false,
      render: (type: ChangePointAnnotation['type']) => <EuiBadge color="hollow">{type}</EuiBadge>,
    },
    {
      id: 'pValue',
      'data-test-subj': 'aiopsChangePointPValue',
      field: 'p_value',
      name: (
        <EuiToolTip
          content={i18n.translate('xpack.aiops.changePointDetection.pValueTooltip', {
            defaultMessage:
              'Indicates how extreme the change is. Lower values indicate greater change.',
          })}
        >
          <span>
            {i18n.translate(
              'xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.pValueLabel',
              {
                defaultMessage: 'p-value',
              }
            )}
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      sortable: true,
      truncateText: false,
      render: (pValue: ChangePointAnnotation['p_value']) => pValue.toPrecision(3),
    },
    ...(fieldConfig.splitField
      ? [
          {
            id: 'groupName',
            'data-test-subj': 'aiopsChangePointGroupName',
            field: 'group.name',
            name: i18n.translate('xpack.aiops.changePointDetection.fieldNameColumn', {
              defaultMessage: 'Field name',
            }),
            truncateText: false,
          },
          {
            id: 'groupValue',
            'data-test-subj': 'aiopsChangePointGroupValue',
            field: 'group.value',
            name: i18n.translate('xpack.aiops.changePointDetection.fieldValueColumn', {
              defaultMessage: 'Field value',
            }),
            truncateText: false,
            sortable: true,
          },
          {
            name: i18n.translate('xpack.aiops.changePointDetection.actionsColumn', {
              defaultMessage: 'Actions',
            }),
            actions: [
              {
                name: i18n.translate(
                  'xpack.aiops.changePointDetection.actions.filterForValueAction',
                  {
                    defaultMessage: 'Filter for value',
                  }
                ),
                description: i18n.translate(
                  'xpack.aiops.changePointDetection.actions.filterForValueAction',
                  {
                    defaultMessage: 'Filter for value',
                  }
                ),
                icon: 'plusInCircle',
                color: 'primary',
                type: 'icon',
                onClick: (item) => {
                  filterManager.addFilters(
                    getFilterConfig(dataView.id!, item as Required<ChangePointAnnotation>, false)!
                  );
                },
                isPrimary: true,
                'data-test-subj': 'aiopsChangePointFilterForValue',
              },
              {
                name: i18n.translate(
                  'xpack.aiops.changePointDetection.actions.filterOutValueAction',
                  {
                    defaultMessage: 'Filter out value',
                  }
                ),
                description: i18n.translate(
                  'xpack.aiops.changePointDetection.actions.filterOutValueAction',
                  {
                    defaultMessage: 'Filter out value',
                  }
                ),
                icon: 'minusInCircle',
                color: 'primary',
                type: 'icon',
                onClick: (item) => {
                  filterManager.addFilters(
                    getFilterConfig(dataView.id!, item as Required<ChangePointAnnotation>, true)!
                  );
                },
                isPrimary: true,
                'data-test-subj': 'aiopsChangePointFilterOutValue',
              },
            ] as Array<DefaultItemAction<ChangePointAnnotation>>,
          },
        ]
      : []),
  ];

  const selectionValue = useMemo<EuiTableSelectionType<ChangePointAnnotation>>(() => {
    return {
      selectable: (item) => true,
      onSelectionChange: (selection) => {
        onSelectionChange(
          selection.map((s) => {
            return {
              ...s,
              ...fieldConfig,
            };
          })
        );
      },
    };
  }, [fieldConfig, onSelectionChange]);

  return (
    <EuiInMemoryTable<ChangePointAnnotation>
      itemId={'id'}
      selection={selectionValue}
      loading={isLoading}
      data-test-subj={`aiopsChangePointResultsTable ${isLoading ? 'loading' : 'loaded'}`}
      items={annotations}
      columns={columns}
      pagination={{ pageSizeOptions: [5, 10, 15] }}
      sorting={defaultSorting}
      hasActions={hasActions}
      rowProps={(item) => ({
        'data-test-subj': `aiopsChangePointResultsTableRow row-${item.id}`,
      })}
      message={
        isLoading ? (
          <EuiEmptyPrompt
            iconType="search"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.fetchingChangePointsTitle"
                  defaultMessage="Fetching change points..."
                />
              </h2>
            }
          />
        ) : (
          <EuiEmptyPrompt
            iconType="search"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.noChangePointsFoundTitle"
                  defaultMessage="No change points found"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.noChangePointsFoundMessage"
                  defaultMessage="Detect statistically significant change points such as dips, spikes, and distribution changes in a metric. Select a metric and set a time range to start detecting change points in your data."
                />
              </p>
            }
          />
        )
      }
    />
  );
};

export const MiniChartPreview: FC<ChartComponentProps> = ({ fieldConfig, annotation }) => {
  const {
    lens: { EmbeddableComponent },
  } = useAiopsAppContext();

  const { filters, query, attributes, timeRange } = useCommonChartProps({
    annotation,
    fieldConfig,
    previewMode: true,
  });

  return (
    <div data-test-subj={'aiopChangePointPreviewChart'}>
      <EmbeddableComponent
        id={`mini_changePointChart_${annotation.group ? annotation.group.value : annotation.label}`}
        style={{ height: 80 }}
        timeRange={timeRange}
        query={query}
        filters={filters}
        // @ts-ignore
        attributes={attributes}
        renderMode={'preview'}
        executionContext={{
          type: 'aiops_change_point_detection_chart',
          name: 'Change point detection',
        }}
      />
    </div>
  );
};
