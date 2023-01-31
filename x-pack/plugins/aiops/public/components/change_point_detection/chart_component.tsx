/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';

import { type TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { FilterStateStore } from '@kbn/es-query';
import { useTimeRangeUpdates } from '@kbn/ml-date-picker';

import { useDataSource } from '../../hooks/use_data_source';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

import { useChangePointDetectionContext } from './change_point_detection_context';
import { fnOperationTypeMapping } from './constants';

export interface ChartComponentProps {
  annotation: {
    group_field: string;
    label: string;
    timestamp: string;
    reason: string;
  };
}

export const ChartComponent: FC<ChartComponentProps> = React.memo(({ annotation }) => {
  const {
    lens: { EmbeddableComponent },
  } = useAiopsAppContext();

  const timeRange = useTimeRangeUpdates();
  const { dataView } = useDataSource();
  const { requestParams, bucketInterval } = useChangePointDetectionContext();

  const filters = useMemo(
    () => [
      {
        meta: {
          index: dataView.id!,
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: requestParams.splitField,
          params: {
            query: annotation.group_field,
          },
        },
        query: {
          match_phrase: {
            [requestParams.splitField]: annotation.group_field,
          },
        },
        $state: {
          store: FilterStateStore.APP_STATE,
        },
      },
    ],
    [dataView.id, requestParams.splitField, annotation.group_field]
  );

  // @ts-ignore incorrect types for attributes
  const attributes = useMemo<TypedLensByValueInput['attributes']>(() => {
    return {
      title: annotation.group_field,
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
          legend: {
            isVisible: false,
            position: 'right',
          },
          valueLabels: 'hide',
          fittingFunction: 'None',
          axisTitlesVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          tickLabelsVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          labelsOrientation: {
            x: 0,
            yLeft: 0,
            yRight: 0,
          },
          gridlinesVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
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
                        label: annotation.label,
                        icon: 'triangle',
                        textVisibility: true,
                        key: {
                          type: 'point_in_time',
                          timestamp: annotation.timestamp,
                        },
                        id: 'a8fb297c-8d96-4011-93c0-45af110d5302',
                        isHidden: false,
                        color: '#F04E98',
                        lineStyle: 'solid',
                        lineWidth: 2,
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
                    label: `${requestParams.fn}(${requestParams.metricField})`,
                    dataType: 'number',
                    operationType: fnOperationTypeMapping[requestParams.fn],
                    sourceField: requestParams.metricField,
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
  }, [dataView.id, dataView.timeFieldName, annotation, requestParams, filters, bucketInterval]);

  return (
    <EmbeddableComponent
      id={`changePointChart_${annotation.group_field}`}
      style={{ height: 350 }}
      timeRange={timeRange}
      attributes={attributes}
      renderMode={'view'}
      executionContext={{
        type: 'aiops_change_point_detection_chart',
        name: 'Change point detection',
      }}
    />
  );
});
