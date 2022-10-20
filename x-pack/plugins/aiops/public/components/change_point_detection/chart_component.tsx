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
      title: 'test_01',
      description: '',
      visualizationType: 'lnsXY',
      type: 'lens',
      references: [
        {
          type: 'index-pattern',
          id: dataView.id!,
          name: 'indexpattern-datasource-layer-87968adb-d2da-47ed-a163-728b31bd75d6',
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
              layerId: '87968adb-d2da-47ed-a163-728b31bd75d6',
              accessors: ['44b2de1e-e8bc-4ef1-b05a-47222c618d71'],
              position: 'top',
              seriesType: 'line',
              showGridlines: false,
              layerType: 'data',
              xAccessor: 'b233dc2b-67d0-4a47-b950-94c79c9fb0ae',
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
              '87968adb-d2da-47ed-a163-728b31bd75d6': {
                columns: {
                  'b233dc2b-67d0-4a47-b950-94c79c9fb0ae': {
                    label: '@timestamp',
                    dataType: 'date',
                    operationType: 'date_histogram',
                    sourceField: '@timestamp',
                    isBucketed: true,
                    scale: 'interval',
                    params: {
                      interval: '15m',
                      includeEmptyRows: true,
                      dropPartials: false,
                    },
                  },
                  '44b2de1e-e8bc-4ef1-b05a-47222c618d71': {
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
                  'b233dc2b-67d0-4a47-b950-94c79c9fb0ae',
                  '44b2de1e-e8bc-4ef1-b05a-47222c618d71',
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
