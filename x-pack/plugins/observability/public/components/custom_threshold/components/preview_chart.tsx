/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Comparator } from '../../../../common/custom_threshold_rule/types';
import { useKibana } from '../../../utils/kibana_react';
const getReferences = (dataViewTitle: string) => [
  {
    type: 'index-pattern',
    id: dataViewTitle,
    name: 'dataViewIndexPattern',
  },
];
interface IGetAttribute {
  dataViewId: string;
  threshold: number;
  aggType: string;
  field: string;
}
const getAnnotationDirection = (comparator: keyof Comparator) => {
  console.log('comparator', comparator);
  if (comparator === Comparator.GT || comparator === Comparator.GT_OR_EQ) return 'above';
  if (comparator === Comparator.LT || comparator === Comparator.LT_OR_EQ) return 'below';
};
const getAttribute = ({ dataViewId, threshold, aggType, field, comparator }: IGetAttribute) => ({
  title: 'test',
  description: '',
  visualizationType: 'lnsXY',
  type: 'lens',
  references: [
    {
      type: 'index-pattern',
      id: dataViewId,
      name: 'indexpattern-datasource-layer-86366fb1-fca3-4d62-8106-6ec940737fb6',
    },
    {
      type: 'index-pattern',
      id: dataViewId,
      name: 'indexpattern-datasource-layer-a0dfd83c-fcd5-4ef9-85aa-8763d189c37f',
    },
  ],
  state: {
    visualization: {
      title: 'Empty XY chart',
      legend: {
        isVisible: false,
        position: 'right',
        showSingleSeries: false,
      },
      valueLabels: 'hide',
      preferredSeriesType: 'bar_stacked',
      layers: [
        {
          layerId: '86366fb1-fca3-4d62-8106-6ec940737fb6',
          accessors: ['b6d2aa8a-c8d2-4f4f-9ded-4cf9fe08111c'],
          position: 'top',
          seriesType: 'bar_stacked',
          showGridlines: false,
          layerType: 'data',
          colorMapping: {
            assignmentMode: 'auto',
            assignments: [],
            specialAssignments: [
              {
                rule: {
                  type: 'other',
                },
                color: {
                  type: 'categorical',
                  paletteId: 'neutral',
                  colorIndex: 1,
                },
                touched: false,
              },
            ],
            paletteId: 'eui_amsterdam_color_blind',
            colorMode: {
              type: 'categorical',
            },
          },
          xAccessor: '82e4f3be-f6e0-402a-8bf6-2104fd89f31d',
        },
        {
          layerId: 'a0dfd83c-fcd5-4ef9-85aa-8763d189c37f',
          layerType: 'referenceLine',
          accessors: ['ef0f5642-61f7-47c8-84a4-cfcd8448e138'],
          yConfig: [
            {
              forAccessor: 'ef0f5642-61f7-47c8-84a4-cfcd8448e138',
              axisMode: 'left',
              color: '#da3d3d',
              lineWidth: 3,
              fill: getAnnotationDirection(comparator),
            },
          ],
        },
      ],
      gridlinesVisibilitySettings: {
        x: true,
        yLeft: false,
        yRight: true,
      },
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      yLeftExtent: {
        mode: 'full',
        niceValues: true,
      },
      hideEndzones: false,
      showCurrentTimeMarker: false,
      axisTitlesVisibilitySettings: {
        x: true,
        yLeft: false,
        yRight: true,
      },
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '86366fb1-fca3-4d62-8106-6ec940737fb6': {
            columns: {
              '82e4f3be-f6e0-402a-8bf6-2104fd89f31d': {
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
              'b6d2aa8a-c8d2-4f4f-9ded-4cf9fe08111c': {
                label: 'Average of system.cpu.cores',
                dataType: 'number',
                operationType: 'average',
                sourceField: field,
                isBucketed: false,
                scale: 'ratio',
                params: {
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
              '82e4f3be-f6e0-402a-8bf6-2104fd89f31d',
              'b6d2aa8a-c8d2-4f4f-9ded-4cf9fe08111c',
            ],
            sampling: 1,
            ignoreGlobalFilters: false,
            incompleteColumns: {},
          },
          'a0dfd83c-fcd5-4ef9-85aa-8763d189c37f': {
            linkToLayers: [],
            columns: {
              'ef0f5642-61f7-47c8-84a4-cfcd8448e138': {
                label: `threshold: ${threshold}`,
                dataType: 'number',
                operationType: 'static_value',
                isStaticValue: true,
                isBucketed: false,
                scale: 'ratio',
                params: {
                  value: threshold,
                },
                references: [],
              },
            },
            columnOrder: ['ef0f5642-61f7-47c8-84a4-cfcd8448e138'],
            sampling: 1,
            ignoreGlobalFilters: false,
            incompleteColumns: {},
          },
        },
      },
      indexpattern: {
        layers: {},
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
});

interface PreviewChartPros {
  metricExpression: MetricExpression;
  dataViewId: string;
}

function PreviewChart({ metricExpression, dataViewId }: PreviewChartPros) {
  const {
    services: { lens, dataViews },
  } = useKibana();
  const { metrics, timeSize, timeUnit, threshold, equation, comparator } = metricExpression;
  console.log('metricExpression', metricExpression);

  console.log('metricExpression', dataViewId);

  if (!metrics || metrics.length === 0) {
    return <div>Error no metrics</div>;
  }
  if (metrics.length > 1) {
    // It means have to use formula
  }
  const { field, aggType, name, filter } = metrics[0];

  console.log('dataViewId========------->', dataViewId);
  return (
    <div>
      <lens.EmbeddableComponent
        onLoad={(isLoading, adapters) => {
          console.log(isLoading);
          console.log(adapters);
        }}
        id=""
        style={{ height: 180 }}
        // timeRange={{ from: '2023-10-05T11:32:49.805', to: '2023-10-06T11:32:49.805' }}
        timeRange={{ from: `now-${timeSize * 20}${timeUnit}`, to: 'now' }}
        attributes={getAttribute({
          dataViewId,
          threshold,
          aggType,
          field,
          comparator,
        })}
      />
    </div>
  );
}
// eslint-disable-next-line import/no-default-export
export default PreviewChart; // Correct export
