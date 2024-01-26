/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { EuiThemeComputed, transparentize } from '@elastic/eui';

export interface IndexPattern {
  pattern: string;
  timestampField: string;
}

export interface Threshold {
  value: number;
  fill: 'above' | 'below';
}

export interface Timerange {
  from: number;
  to?: number;
}

function createBaseLensDefinition<D extends {}>(
  index: IndexPattern,
  euiTheme: EuiThemeComputed,
  threshold: Threshold,
  alertRange: Timerange,
  layerDef: D,
  filter?: string
) {
  return {
    title: 'Threshold Chart',
    visualizationType: 'lnsXY',
    type: 'lens',
    references: [],
    state: {
      visualization: {
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
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId: 'e6f553a0-9e36-4eea-8ecf-8261523c6f44',
            accessors: ['607b2253-ed20-4f0a-bf62-07a1f846cca4'],
            position: 'top',
            seriesType: 'bar_stacked',
            showGridlines: false,
            layerType: 'data',
            xAccessor: '8ed7d473-ff48-4c90-be2c-ae46f3a11030',
            yConfig: [
              {
                forAccessor: '607b2253-ed20-4f0a-bf62-07a1f846cca4',
                color: '#6092c0',
              },
            ],
          },
          {
            layerId: '62dfc313-3922-4870-b568-ff0818da38b3',
            layerType: 'annotations',
            annotations: [
              {
                type: 'manual',
                id: 'ffe44253-a8c7-4755-821f-47be5bfac288',
                label: 'Alert Line',
                key: {
                  type: 'point_in_time',
                  timestamp: moment(alertRange.from).toISOString(),
                },
                lineWidth: 3,
                color: euiTheme.colors.danger,
                icon: 'alert',
              },
              {
                type: 'manual',
                label: 'Alert',
                key: {
                  type: 'range',
                  timestamp: moment(alertRange.from).toISOString(),
                  endTimestamp: moment(alertRange.to).toISOString(),
                },
                id: '07d15b13-4b6c-4d82-b45d-9d58ced1c2a8',
                color: transparentize(euiTheme.colors.danger, 0.2),
              },
            ],
            ignoreGlobalFilters: true,
            persistanceType: 'byValue',
          },
          {
            layerId: '90f87c46-9685-49af-b4ed-066eb65e2b39',
            layerType: 'referenceLine',
            accessors: ['7fb02af1-0823-4787-a316-3b05a4539d2c'],
            yConfig: [
              {
                forAccessor: '7fb02af1-0823-4787-a316-3b05a4539d2c',
                axisMode: 'left',
                color: euiTheme.colors.danger,
                lineWidth: 2,
                fill: threshold.fill,
              },
            ],
          },
        ],
      },
      query: {
        query: filter || '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        formBased: {
          layers: {
            'e6f553a0-9e36-4eea-8ecf-8261523c6f44': layerDef,
            '90f87c46-9685-49af-b4ed-066eb65e2b39': {
              linkToLayers: [],
              columns: {
                '7fb02af1-0823-4787-a316-3b05a4539d2c': {
                  label: 'Threshold',
                  dataType: 'number',
                  operationType: 'static_value',
                  isStaticValue: true,
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    value: threshold.value,
                  },
                  references: [],
                  customLabel: true,
                },
              },
              columnOrder: ['7fb02af1-0823-4787-a316-3b05a4539d2c'],
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
      internalReferences: [
        {
          type: 'index-pattern',
          id: 'd09436e6-20c0-4982-aaf6-b67ec371b27d',
          name: 'indexpattern-datasource-layer-e6f553a0-9e36-4eea-8ecf-8261523c6f44',
        },
        {
          type: 'index-pattern',
          id: 'd09436e6-20c0-4982-aaf6-b67ec371b27d',
          name: 'indexpattern-datasource-layer-90f87c46-9685-49af-b4ed-066eb65e2b39',
        },
        {
          type: 'index-pattern',
          id: 'd09436e6-20c0-4982-aaf6-b67ec371b27d',
          name: 'xy-visualization-layer-62dfc313-3922-4870-b568-ff0818da38b3',
        },
      ],
      adHocDataViews: {
        'd09436e6-20c0-4982-aaf6-b67ec371b27d': {
          id: 'd09436e6-20c0-4982-aaf6-b67ec371b27d',
          title: index.pattern,
          timeFieldName: index.timestampField,
          sourceFilters: [],
          fieldFormats: {},
          runtimeFieldMap: {},
          fieldAttrs: {},
          allowNoIndex: false,
          name: 'adhoc',
        },
      },
    },
  };
}

export function createLensDefinitionForRatioChart(
  index: IndexPattern,
  euiTheme: EuiThemeComputed,
  numeratorKql: string,
  denominatorKql: string,
  threshold: Threshold,
  alertRange: Timerange,
  interval: string,
  filter?: string
) {
  const layerDef = {
    columns: {
      '8ed7d473-ff48-4c90-be2c-ae46f3a11030': {
        label: index.timestampField,
        dataType: 'date',
        operationType: 'date_histogram',
        sourceField: index.timestampField,
        isBucketed: true,
        scale: 'interval',
        params: {
          interval,
          includeEmptyRows: true,
          dropPartials: false,
        },
      },
      '607b2253-ed20-4f0a-bf62-07a1f846cca4X0': {
        label: 'Part of ratio',
        dataType: 'number',
        operationType: 'count',
        isBucketed: false,
        scale: 'ratio',
        sourceField: '___records___',
        filter: {
          query: numeratorKql,
          language: 'kuery',
        },
        params: {
          emptyAsNull: false,
        },
        customLabel: true,
      },
      '607b2253-ed20-4f0a-bf62-07a1f846cca4X1': {
        label: 'Part of ratio',
        dataType: 'number',
        operationType: 'count',
        isBucketed: false,
        scale: 'ratio',
        sourceField: '___records___',
        filter: {
          query: denominatorKql,
          language: 'kuery',
        },
        params: {
          emptyAsNull: false,
        },
        customLabel: true,
      },
      '607b2253-ed20-4f0a-bf62-07a1f846cca4X2': {
        label: 'Part of ratio',
        dataType: 'number',
        operationType: 'math',
        isBucketed: false,
        scale: 'ratio',
        params: {
          tinymathAst: {
            type: 'function',
            name: 'divide',
            args: [
              '607b2253-ed20-4f0a-bf62-07a1f846cca4X0',
              '607b2253-ed20-4f0a-bf62-07a1f846cca4X1',
            ],
            location: {
              min: 0,
              max: 94,
            },
            text: `count(kql=\'${numeratorKql}\') / count(kql=\'${denominatorKql}\')`,
          },
        },
        references: [
          '607b2253-ed20-4f0a-bf62-07a1f846cca4X0',
          '607b2253-ed20-4f0a-bf62-07a1f846cca4X1',
        ],
        customLabel: true,
      },
      '607b2253-ed20-4f0a-bf62-07a1f846cca4': {
        label: 'ratio',
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: {
          formula: `count(kql=\'${numeratorKql}\') / count(kql=\'${denominatorKql}\')`,
          isFormulaBroken: false,
        },
        references: ['607b2253-ed20-4f0a-bf62-07a1f846cca4X2'],
        customLabel: true,
      },
    },
    columnOrder: [
      '8ed7d473-ff48-4c90-be2c-ae46f3a11030',
      '607b2253-ed20-4f0a-bf62-07a1f846cca4',
      '607b2253-ed20-4f0a-bf62-07a1f846cca4X0',
      '607b2253-ed20-4f0a-bf62-07a1f846cca4X1',
      '607b2253-ed20-4f0a-bf62-07a1f846cca4X2',
    ],
    incompleteColumns: {},
    sampling: 1,
  };
  return createBaseLensDefinition(
    index,
    euiTheme,
    threshold,
    alertRange,
    layerDef,
    filter
  ) as unknown as TypedLensByValueInput['attributes'];
}

export function createLensDefinitionForCountChart(
  index: IndexPattern,
  euiTheme: EuiThemeComputed,
  kql: string,
  threshold: Threshold,
  alertRange: Timerange,
  interval: string,
  filter?: string
) {
  const layerDef = {
    columns: {
      '8ed7d473-ff48-4c90-be2c-ae46f3a11030': {
        label: index.timestampField,
        dataType: 'date',
        operationType: 'date_histogram',
        sourceField: index.timestampField,
        isBucketed: true,
        scale: 'interval',
        params: {
          interval,
          includeEmptyRows: true,
          dropPartials: false,
        },
      },
      '607b2253-ed20-4f0a-bf62-07a1f846cca4X0': {
        label: `Part of count(kql=\'${kql}\')`,
        dataType: 'number',
        operationType: 'count',
        isBucketed: false,
        scale: 'ratio',
        sourceField: '___records___',
        filter: {
          query: kql,
          language: 'kuery',
        },
        params: {
          emptyAsNull: false,
        },
        customLabel: true,
      },
      '607b2253-ed20-4f0a-bf62-07a1f846cca4': {
        label: 'document count',
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: {
          formula: `count(kql=\'${kql}\')`,
          isFormulaBroken: false,
        },
        references: ['607b2253-ed20-4f0a-bf62-07a1f846cca4X0'],
        customLabel: true,
      },
    },
    columnOrder: [
      '8ed7d473-ff48-4c90-be2c-ae46f3a11030',
      '607b2253-ed20-4f0a-bf62-07a1f846cca4',
      '607b2253-ed20-4f0a-bf62-07a1f846cca4X0',
    ],
    incompleteColumns: {},
    sampling: 1,
  };

  return createBaseLensDefinition(
    index,
    euiTheme,
    threshold,
    alertRange,
    layerDef,
    filter
  ) as unknown as TypedLensByValueInput['attributes'];
}
