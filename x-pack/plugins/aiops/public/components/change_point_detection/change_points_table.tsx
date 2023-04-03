/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EuiBasicTableColumn, EuiInMemoryTable, EuiBadge, EuiEmptyPrompt } from '@elastic/eui';
import React, { type FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useTimeRangeUpdates } from '@kbn/ml-date-picker';
import { FilterStateStore } from '@kbn/es-query';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDataSource } from '../../hooks/use_data_source';
import { fnOperationTypeMapping } from './constants';
import {
  type ChangePointAnnotation,
  FieldConfig,
  useChangePointDetectionContext,
} from './change_point_detection_context';
import { type ChartComponentProps } from './chart_component';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

export interface ChangePointsTableProps {
  annotations: ChangePointAnnotation[];
  fieldConfig: FieldConfig;
  isLoading: boolean;
}

export const ChangePointsTable: FC<ChangePointsTableProps> = ({
  isLoading,
  annotations,
  fieldConfig,
}) => {
  const { fieldFormats } = useAiopsAppContext();

  const dateFormatter = useMemo(() => fieldFormats.deserialize({ id: 'date' }), [fieldFormats]);

  const sorting = {
    sort: {
      field: 'p_value',
      direction: 'asc' as const,
    },
  };

  const columns: Array<EuiBasicTableColumn<ChangePointAnnotation>> = [
    {
      field: 'timestamp',
      name: i18n.translate('xpack.aiops.changePointDetection.timeColumn', {
        defaultMessage: 'Time',
      }),
      sortable: true,
      truncateText: false,
      width: '230px',
      render: (timestamp: ChangePointAnnotation['timestamp']) => dateFormatter.convert(timestamp),
    },
    {
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
      field: 'type',
      name: i18n.translate('xpack.aiops.changePointDetection.typeColumn', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      truncateText: false,
      render: (type: ChangePointAnnotation['type']) => <EuiBadge color="hollow">{type}</EuiBadge>,
    },
    {
      field: 'p_value',
      name: i18n.translate(
        'xpack.aiops.explainLogRateSpikes.spikeAnalysisTableGroups.pValueLabel',
        {
          defaultMessage: 'p-value',
        }
      ),
      sortable: true,
      truncateText: false,
      render: (pValue: ChangePointAnnotation['p_value']) => pValue.toPrecision(3),
    },
    ...(fieldConfig.splitField
      ? [
          {
            field: 'group.name',
            name: i18n.translate('xpack.aiops.changePointDetection.fieldNameColumn', {
              defaultMessage: 'Field name',
            }),
            truncateText: false,
          },
          {
            field: 'group.value',
            name: i18n.translate('xpack.aiops.changePointDetection.fieldValueColumn', {
              defaultMessage: 'Field value',
            }),
            truncateText: false,
            sortable: true,
          },
        ]
      : []),
  ];

  return (
    <EuiInMemoryTable<ChangePointAnnotation>
      loading={isLoading}
      items={annotations}
      columns={columns}
      pagination={{ pageSizeOptions: [5, 10, 15] }}
      sorting={sorting}
      message={
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
      }
    />
  );
};

export const MiniChartPreview: FC<ChartComponentProps> = ({ fieldConfig, annotation }) => {
  const {
    lens: { EmbeddableComponent },
  } = useAiopsAppContext();

  const timeRange = useTimeRangeUpdates();
  const { dataView } = useDataSource();
  const { bucketInterval } = useChangePointDetectionContext();

  const filters = useMemo(() => {
    return annotation.group
      ? [
          {
            meta: {
              index: dataView.id!,
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: annotation.group.name,
              params: {
                query: annotation.group.value,
              },
            },
            query: {
              match_phrase: {
                [annotation.group.name]: annotation.group.value,
              },
            },
            $state: {
              store: FilterStateStore.APP_STATE,
            },
          },
        ]
      : [];
  }, [dataView.id, annotation.group]);

  // @ts-ignore incorrect types for attributes
  const attributes = useMemo<TypedLensByValueInput['attributes']>(() => {
    return {
      title: annotation.group?.value ?? '',
      description: '',
      visualizationType: 'lnsXY',
      type: 'lens',
      references: [
        {
          type: 'index-pattern',
          id: dataView.id!,
          name: 'indexpattern-datasource-layer-2d61a885-abb0-4d4e-a5f9-c488caec3c22',
        },
        {
          type: 'index-pattern',
          id: dataView.id!,
          name: 'xy-visualization-layer-8d26ab67-b841-4877-9d02-55bf270f9caf',
        },
      ],
      state: {
        visualization: {
          hideEndzones: true,
          yLeftExtent: {
            mode: 'dataBounds',
          },
          legend: {
            isVisible: false,
            position: 'right',
          },
          valueLabels: 'hide',
          fittingFunction: 'None',
          axisTitlesVisibilitySettings: {
            x: false,
            yLeft: false,
            yRight: false,
          },
          tickLabelsVisibilitySettings: {
            x: false,
            yLeft: false,
            yRight: false,
          },
          labelsOrientation: {
            x: 0,
            yLeft: 0,
            yRight: 0,
          },
          gridlinesVisibilitySettings: {
            x: false,
            yLeft: false,
            yRight: false,
          },
          preferredSeriesType: 'line',
          layers: [
            {
              layerId: '2d61a885-abb0-4d4e-a5f9-c488caec3c22',
              accessors: ['e9f26d17-fb36-4982-8539-03f1849cbed0'],
              position: 'top',
              seriesType: 'line',
              showGridlines: false,
              layerType: 'data',
              xAccessor: '877e6638-bfaa-43ec-afb9-2241dc8e1c86',
            },
            ...(annotation.timestamp
              ? [
                  {
                    layerId: '8d26ab67-b841-4877-9d02-55bf270f9caf',
                    layerType: 'annotations',
                    annotations: [
                      {
                        type: 'manual',
                        icon: 'triangle',
                        textVisibility: false,
                        label: annotation.label,
                        key: {
                          type: 'point_in_time',
                          timestamp: annotation.timestamp,
                        },
                        id: 'a8fb297c-8d96-4011-93c0-45af110d5302',
                        isHidden: false,
                        color: '#F04E98',
                        lineStyle: 'solid',
                        lineWidth: 1,
                        outside: false,
                      },
                    ],
                    ignoreGlobalFilters: true,
                  },
                ]
              : []),
          ],
        },
        query: {
          query: '',
          language: 'kuery',
        },
        filters,
        datasourceStates: {
          formBased: {
            layers: {
              '2d61a885-abb0-4d4e-a5f9-c488caec3c22': {
                columns: {
                  '877e6638-bfaa-43ec-afb9-2241dc8e1c86': {
                    label: dataView.timeFieldName,
                    dataType: 'date',
                    operationType: 'date_histogram',
                    sourceField: dataView.timeFieldName,
                    isBucketed: true,
                    scale: 'interval',
                    params: {
                      interval: bucketInterval.expression,
                      includeEmptyRows: true,
                      dropPartials: false,
                    },
                  },
                  'e9f26d17-fb36-4982-8539-03f1849cbed0': {
                    label: `${fieldConfig.fn}(${fieldConfig.metricField})`,
                    dataType: 'number',
                    operationType: fnOperationTypeMapping[fieldConfig.fn],
                    sourceField: fieldConfig.metricField,
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      emptyAsNull: true,
                    },
                  },
                },
                columnOrder: [
                  '877e6638-bfaa-43ec-afb9-2241dc8e1c86',
                  'e9f26d17-fb36-4982-8539-03f1849cbed0',
                ],
                incompleteColumns: {},
              },
            },
          },
          textBased: {
            layers: {},
          },
        },
        internalReferences: [],
        adHocDataViews: {},
      },
    };
  }, [dataView.id, dataView.timeFieldName, annotation, fieldConfig, filters, bucketInterval]);

  return (
    <div>
      <EmbeddableComponent
        id={`mini_changePointChart_${annotation.group ? annotation.group.value : annotation.label}`}
        style={{ height: 80 }}
        timeRange={timeRange}
        attributes={attributes}
        renderMode={'view'}
        executionContext={{
          type: 'aiops_change_point_detection_chart',
          name: 'Change point detection',
        }}
      />
    </div>
  );
};
