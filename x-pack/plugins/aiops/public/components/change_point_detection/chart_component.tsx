/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { type TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { useDataSource } from '../../hooks/use_data_source';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useTimeRangeUpdates } from '../../hooks/use_time_filter';

export const ChartComponent: FC = React.memo(() => {
  const {
    lens: { EmbeddableComponent },
  } = useAiopsAppContext();

  const timeRange = useTimeRangeUpdates();
  const { dataView } = useDataSource();

  const attributes = useMemo<TypedLensByValueInput['attributes']>(() => {
    return {
      title: 'change_point_test',
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
          id: 'a65621a2-d2b9-45fa-a816-c57622139e2a',
          name: 'xy-visualization-layer-8d26ab67-b841-4877-9d02-55bf270f9caf',
        },
      ],
      state: {
        visualization: {
          legend: {
            isVisible: true,
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
            {
              layerId: '8d26ab67-b841-4877-9d02-55bf270f9caf',
              layerType: 'annotations',
              annotations: [
                {
                  type: 'manual',
                  label: 'Change point detected',
                  icon: 'bell',
                  key: {
                    type: 'range',
                    timestamp: '2021-08-16T00:00:00.000Z',
                    endTimestamp: '2021-08-16T10:30:00.000Z',
                  },
                  id: 'a8fb297c-8d96-4011-93c0-45af110d5302',
                  isHidden: false,
                  color: '#F04E981A',
                  outside: false,
                },
              ],
              ignoreGlobalFilters: true,
            },
          ],
        },
        query: {
          query: '',
          language: 'kuery',
        },
        filters: [],
        datasourceStates: {
          formBased: {
            layers: {
              '2d61a885-abb0-4d4e-a5f9-c488caec3c22': {
                columns: {
                  '877e6638-bfaa-43ec-afb9-2241dc8e1c86': {
                    label: '@timestamp',
                    dataType: 'date',
                    operationType: 'date_histogram',
                    sourceField: '@timestamp',
                    isBucketed: true,
                    scale: 'interval',
                    params: {
                      interval: 'auto',
                      includeEmptyRows: true,
                      dropPartials: false,
                    },
                  },
                  'e9f26d17-fb36-4982-8539-03f1849cbed0': {
                    label: 'Median of value',
                    dataType: 'number',
                    operationType: 'median',
                    sourceField: 'value',
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
  }, [dataView.id]);

  return (
    <EmbeddableComponent
      id="changePointChart"
      style={{ height: 500 }}
      timeRange={timeRange}
      attributes={attributes}
    />
  );
});
