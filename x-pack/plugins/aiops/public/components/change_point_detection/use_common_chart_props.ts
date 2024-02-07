/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { FilterStateStore, type TimeRange } from '@kbn/es-query';
import { type TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { useMemo } from 'react';
import { useFilerQueryUpdates } from '../../hooks/use_filters_query';
import { fnOperationTypeMapping } from './constants';
import { useDataSource } from '../../hooks/use_data_source';
import { ChangePointAnnotation, FieldConfig } from './change_point_detection_context';

/**
 * Provides common props for the Lens Embeddable component
 * based on the change point definition and currently applied filters and query.
 */
export const useCommonChartProps = ({
  annotation,
  fieldConfig,
  previewMode = false,
  bucketInterval,
}: {
  fieldConfig: FieldConfig;
  annotation: ChangePointAnnotation;
  previewMode?: boolean;
  bucketInterval: string;
}): Partial<TypedLensByValueInput> => {
  const { dataView } = useDataSource();

  const { filters: resultFilters, query: resultQuery, timeRange } = useFilerQueryUpdates();

  /**
   * In order to correctly render annotations for change points at the edges,
   * we need to adjust time bound based on the change point timestamp.
   */
  const chartTimeRange = useMemo<TimeRange>(() => {
    const absoluteTimeRange = getAbsoluteTimeRange(timeRange);

    return {
      from: moment.min(moment(absoluteTimeRange.from), moment(annotation.timestamp)).toISOString(),
      to: moment.max(moment(absoluteTimeRange.to), moment(annotation.timestamp)).toISOString(),
    };
  }, [timeRange, annotation.timestamp]);

  const filters = useMemo(() => {
    return [
      ...resultFilters,
      // Adds a filter for change point partition value
      ...(annotation.group
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
        : []),
    ];
  }, [dataView.id, annotation.group, resultFilters]);

  const gridAndLabelsVisibility = !previewMode;

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
          },
          valueLabels: 'hide',
          fittingFunction: 'None',
          // Updates per chart type
          axisTitlesVisibilitySettings: {
            x: gridAndLabelsVisibility,
            yLeft: gridAndLabelsVisibility,
            yRight: gridAndLabelsVisibility,
          },
          tickLabelsVisibilitySettings: {
            x: gridAndLabelsVisibility,
            yLeft: gridAndLabelsVisibility,
            yRight: gridAndLabelsVisibility,
          },
          labelsOrientation: {
            x: 0,
            yLeft: 0,
            yRight: 0,
          },
          gridlinesVisibilitySettings: {
            x: gridAndLabelsVisibility,
            yLeft: gridAndLabelsVisibility,
            yRight: gridAndLabelsVisibility,
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
            // Annotation layer
            {
              layerId: '8d26ab67-b841-4877-9d02-55bf270f9caf',
              layerType: 'annotations',
              annotations: [
                {
                  type: 'manual',
                  icon: 'triangle',
                  textVisibility: gridAndLabelsVisibility,
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
              // TODO check if we need to set filter from
              // the filterManager
              ignoreGlobalFilters: false,
            },
          ],
        },
        query: resultQuery,
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
                      interval: bucketInterval,
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
      },
    } as TypedLensByValueInput['attributes'];
  }, [
    annotation.group?.value,
    annotation.timestamp,
    annotation.label,
    dataView.id,
    dataView.timeFieldName,
    resultQuery,
    filters,
    bucketInterval,
    fieldConfig.fn,
    fieldConfig.metricField,
    gridAndLabelsVisibility,
  ]);

  return {
    timeRange: chartTimeRange,
    filters,
    query: resultQuery,
    attributes,
  };
};
