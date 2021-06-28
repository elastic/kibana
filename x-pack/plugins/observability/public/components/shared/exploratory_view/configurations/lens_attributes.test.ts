/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LayerConfig, LensAttributes } from './lens_attributes';
import { mockAppIndexPattern, mockIndexPattern } from '../rtl_helpers';
import { getDefaultConfigs } from './default_configs';
import { sampleAttribute } from './test_data/sample_attribute';
import {
  LCP_FIELD,
  TRANSACTION_DURATION,
  USER_AGENT_NAME,
} from './constants/elasticsearch_fieldnames';
import { buildExistsFilter, buildPhrasesFilter } from './utils';
import { sampleAttributeKpi } from './test_data/sample_attribute_kpi';
import { REPORT_METRIC_FIELD } from './constants';

describe('Lens Attribute', () => {
  mockAppIndexPattern();

  const reportViewConfig = getDefaultConfigs({
    reportType: 'data-distribution',
    dataType: 'ux',
    indexPattern: mockIndexPattern,
  });

  reportViewConfig.baseFilters?.push(...buildExistsFilter('transaction.type', mockIndexPattern));

  let lnsAttr: LensAttributes;

  const layerConfig: LayerConfig = {
    seriesConfig: reportViewConfig,
    seriesType: 'line',
    operationType: 'count',
    indexPattern: mockIndexPattern,
    reportDefinitions: {},
    time: { from: 'now-15m', to: 'now' },
  };

  beforeEach(() => {
    lnsAttr = new LensAttributes([layerConfig]);
  });

  it('should return expected json', function () {
    expect(lnsAttr.getJSON()).toEqual(sampleAttribute);
  });

  it('should return expected json for kpi report type', function () {
    const seriesConfigKpi = getDefaultConfigs({
      reportType: 'kpi-over-time',
      dataType: 'ux',
      indexPattern: mockIndexPattern,
    });

    const lnsAttrKpi = new LensAttributes([
      {
        seriesConfig: seriesConfigKpi,
        seriesType: 'line',
        operationType: 'count',
        indexPattern: mockIndexPattern,
        reportDefinitions: { 'service.name': ['elastic-co'] },
        time: { from: 'now-15m', to: 'now' },
      },
    ]);

    expect(lnsAttrKpi.getJSON()).toEqual(sampleAttributeKpi);
  });

  it('should return main y axis', function () {
    expect(lnsAttr.getMainYAxis(layerConfig, 'layer0', '')).toEqual({
      dataType: 'number',
      isBucketed: false,
      label: 'Pages loaded',
      operationType: 'formula',
      params: {
        format: {
          id: 'percent',
          params: {
            decimals: 0,
          },
        },
        formula: 'count() / overall_sum(count())',
        isFormulaBroken: false,
      },
      references: ['y-axis-column-layer0X4'],
      scale: 'ratio',
    });
  });

  it('should return expected field type', function () {
    expect(JSON.stringify(lnsAttr.getFieldMeta('transaction.type', layerConfig))).toEqual(
      JSON.stringify({
        fieldMeta: {
          count: 0,
          name: 'transaction.type',
          type: 'string',
          esTypes: ['keyword'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
        },
        fieldName: 'transaction.type',
      })
    );
  });

  it('should return expected field type for custom field with default value', function () {
    expect(JSON.stringify(lnsAttr.getFieldMeta(REPORT_METRIC_FIELD, layerConfig))).toEqual(
      JSON.stringify({
        fieldMeta: {
          count: 0,
          name: 'transaction.duration.us',
          type: 'number',
          esTypes: ['long'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
        },
        fieldName: 'transaction.duration.us',
        columnLabel: 'Page load time',
      })
    );
  });

  it('should return expected field type for custom field with passed value', function () {
    const layerConfig1: LayerConfig = {
      seriesConfig: reportViewConfig,
      seriesType: 'line',
      operationType: 'count',
      indexPattern: mockIndexPattern,
      reportDefinitions: { 'performance.metric': [LCP_FIELD] },
      time: { from: 'now-15m', to: 'now' },
    };

    lnsAttr = new LensAttributes([layerConfig1]);

    expect(JSON.stringify(lnsAttr.getFieldMeta(REPORT_METRIC_FIELD, layerConfig1))).toEqual(
      JSON.stringify({
        fieldMeta: {
          count: 0,
          name: TRANSACTION_DURATION,
          type: 'number',
          esTypes: ['long'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
        },
        fieldName: TRANSACTION_DURATION,
        columnLabel: 'Page load time',
      })
    );
  });

  it('should return expected number range column', function () {
    expect(lnsAttr.getNumberRangeColumn('transaction.duration.us', reportViewConfig)).toEqual({
      dataType: 'number',
      isBucketed: true,
      label: 'Page load time',
      operationType: 'range',
      params: {
        maxBars: 'auto',
        ranges: [
          {
            from: 0,
            label: '',
            to: 1000,
          },
        ],
        type: 'histogram',
      },
      scale: 'interval',
      sourceField: 'transaction.duration.us',
    });
  });

  it('should return expected number operation column', function () {
    expect(lnsAttr.getNumberRangeColumn('transaction.duration.us', reportViewConfig)).toEqual({
      dataType: 'number',
      isBucketed: true,
      label: 'Page load time',
      operationType: 'range',
      params: {
        maxBars: 'auto',
        ranges: [
          {
            from: 0,
            label: '',
            to: 1000,
          },
        ],
        type: 'histogram',
      },
      scale: 'interval',
      sourceField: 'transaction.duration.us',
    });
  });

  it('should return expected date histogram column', function () {
    expect(lnsAttr.getDateHistogramColumn('@timestamp')).toEqual({
      dataType: 'date',
      isBucketed: true,
      label: '@timestamp',
      operationType: 'date_histogram',
      params: {
        interval: 'auto',
      },
      scale: 'interval',
      sourceField: '@timestamp',
    });
  });

  it('should return main x axis', function () {
    expect(lnsAttr.getXAxis(layerConfig, 'layer0')).toEqual({
      dataType: 'number',
      isBucketed: true,
      label: 'Page load time',
      operationType: 'range',
      params: {
        maxBars: 'auto',
        ranges: [
          {
            from: 0,
            label: '',
            to: 1000,
          },
        ],
        type: 'histogram',
      },
      scale: 'interval',
      sourceField: 'transaction.duration.us',
    });
  });

  it('should return first layer', function () {
    expect(lnsAttr.getLayers()).toEqual({
      layer0: {
        columnOrder: [
          'x-axis-column-layer0',
          'y-axis-column-layer0',
          'y-axis-column-layer0X0',
          'y-axis-column-layer0X1',
          'y-axis-column-layer0X2',
          'y-axis-column-layer0X3',
          'y-axis-column-layer0X4',
        ],
        columns: {
          'x-axis-column-layer0': {
            dataType: 'number',
            isBucketed: true,
            label: 'Page load time',
            operationType: 'range',
            params: {
              maxBars: 'auto',
              ranges: [
                {
                  from: 0,
                  label: '',
                  to: 1000,
                },
              ],
              type: 'histogram',
            },
            scale: 'interval',
            sourceField: 'transaction.duration.us',
          },
          'y-axis-column-layer0': {
            dataType: 'number',
            filter: {
              language: 'kuery',
              query:
                'transaction.type: page-load and processor.event: transaction and transaction.type : *',
            },
            isBucketed: false,
            label: 'Pages loaded',
            operationType: 'formula',
            params: {
              format: {
                id: 'percent',
                params: {
                  decimals: 0,
                },
              },
              formula:
                "count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *') / overall_sum(count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *'))",
              isFormulaBroken: false,
            },
            references: ['y-axis-column-layer0X4'],
            scale: 'ratio',
          },
          'y-axis-column-layer0X0': {
            customLabel: true,
            dataType: 'number',
            filter: {
              language: 'kuery',
              query:
                'transaction.type: page-load and processor.event: transaction and transaction.type : *',
            },
            isBucketed: false,
            label: 'Part of count() / overall_sum(count())',
            operationType: 'count',
            scale: 'ratio',
            sourceField: 'Records',
          },
          'y-axis-column-layer0X1': {
            customLabel: true,
            dataType: 'number',
            filter: {
              language: 'kuery',
              query:
                'transaction.type: page-load and processor.event: transaction and transaction.type : *',
            },
            isBucketed: false,
            label: 'Part of count() / overall_sum(count())',
            operationType: 'count',
            scale: 'ratio',
            sourceField: 'Records',
          },
          'y-axis-column-layer0X2': {
            customLabel: true,
            dataType: 'number',
            isBucketed: false,
            label: 'Part of count() / overall_sum(count())',
            operationType: 'math',
            params: {
              tinymathAst: 'y-axis-column-layer0X1',
            },
            references: ['y-axis-column-layer0X1'],
            scale: 'ratio',
          },
          'y-axis-column-layer0X3': {
            customLabel: true,
            dataType: 'number',
            isBucketed: false,
            label: 'Part of count() / overall_sum(count())',
            operationType: 'overall_sum',
            references: ['y-axis-column-layer0X2'],
            scale: 'ratio',
          },
          'y-axis-column-layer0X4': {
            customLabel: true,
            dataType: 'number',
            isBucketed: false,
            label: 'Part of count() / overall_sum(count())',
            operationType: 'math',
            params: {
              tinymathAst: {
                args: ['y-axis-column-layer0X0', 'y-axis-column-layer0X3'],
                location: {
                  max: 30,
                  min: 0,
                },
                name: 'divide',
                text:
                  "count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *') / overall_sum(count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *'))",
                type: 'function',
              },
            },
            references: ['y-axis-column-layer0X0', 'y-axis-column-layer0X3'],
            scale: 'ratio',
          },
        },
        incompleteColumns: {},
      },
    });
  });

  it('should return expected XYState', function () {
    expect(lnsAttr.getXyState()).toEqual({
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      curveType: 'CURVE_MONOTONE_X',
      fittingFunction: 'Linear',
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      layers: [
        {
          accessors: ['y-axis-column-layer0'],
          layerId: 'layer0',
          palette: undefined,
          seriesType: 'line',
          xAccessor: 'x-axis-column-layer0',
          yConfig: [{ forAccessor: 'y-axis-column-layer0' }],
        },
      ],
      legend: { isVisible: true, position: 'right' },
      preferredSeriesType: 'line',
      tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
      valueLabels: 'hide',
    });
  });

  describe('Layer breakdowns', function () {
    it('should return breakdown column', function () {
      const layerConfig1: LayerConfig = {
        seriesConfig: reportViewConfig,
        seriesType: 'line',
        operationType: 'count',
        indexPattern: mockIndexPattern,
        reportDefinitions: { 'performance.metric': [LCP_FIELD] },
        breakdown: USER_AGENT_NAME,
        time: { from: 'now-15m', to: 'now' },
      };

      lnsAttr = new LensAttributes([layerConfig1]);

      lnsAttr.getBreakdownColumn({
        sourceField: USER_AGENT_NAME,
        layerId: 'layer0',
        indexPattern: mockIndexPattern,
      });

      expect(lnsAttr.visualization.layers).toEqual([
        {
          accessors: ['y-axis-column-layer0'],
          layerId: 'layer0',
          palette: undefined,
          seriesType: 'line',
          splitAccessor: 'breakdown-column-layer0',
          xAccessor: 'x-axis-column-layer0',
          yConfig: [{ forAccessor: 'y-axis-column-layer0' }],
        },
      ]);

      expect(lnsAttr.layers.layer0).toEqual({
        columnOrder: [
          'x-axis-column-layer0',
          'breakdown-column-layer0',
          'y-axis-column-layer0',
          'y-axis-column-layer0X0',
          'y-axis-column-layer0X1',
          'y-axis-column-layer0X2',
          'y-axis-column-layer0X3',
          'y-axis-column-layer0X4',
        ],
        columns: {
          'breakdown-column-layer0': {
            dataType: 'string',
            isBucketed: true,
            label: 'Top values of Browser family',
            operationType: 'terms',
            params: {
              missingBucket: false,
              orderBy: {
                columnId: 'y-axis-column-layer0',
                type: 'column',
              },
              orderDirection: 'desc',
              otherBucket: true,
              size: 10,
            },
            scale: 'ordinal',
            sourceField: 'user_agent.name',
          },
          'x-axis-column-layer0': {
            dataType: 'number',
            isBucketed: true,
            label: 'Page load time',
            operationType: 'range',
            params: {
              maxBars: 'auto',
              ranges: [
                {
                  from: 0,
                  label: '',
                  to: 1000,
                },
              ],
              type: 'histogram',
            },
            scale: 'interval',
            sourceField: 'transaction.duration.us',
          },
          'y-axis-column-layer0': {
            dataType: 'number',
            filter: {
              language: 'kuery',
              query:
                'transaction.type: page-load and processor.event: transaction and transaction.type : *',
            },
            isBucketed: false,
            label: 'Pages loaded',
            operationType: 'formula',
            params: {
              format: {
                id: 'percent',
                params: {
                  decimals: 0,
                },
              },
              formula:
                "count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *') / overall_sum(count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *'))",
              isFormulaBroken: false,
            },
            references: ['y-axis-column-layer0X4'],
            scale: 'ratio',
          },
          'y-axis-column-layer0X0': {
            customLabel: true,
            dataType: 'number',
            filter: {
              language: 'kuery',
              query:
                'transaction.type: page-load and processor.event: transaction and transaction.type : *',
            },
            isBucketed: false,
            label: 'Part of count() / overall_sum(count())',
            operationType: 'count',
            scale: 'ratio',
            sourceField: 'Records',
          },
          'y-axis-column-layer0X1': {
            customLabel: true,
            dataType: 'number',
            filter: {
              language: 'kuery',
              query:
                'transaction.type: page-load and processor.event: transaction and transaction.type : *',
            },
            isBucketed: false,
            label: 'Part of count() / overall_sum(count())',
            operationType: 'count',
            scale: 'ratio',
            sourceField: 'Records',
          },
          'y-axis-column-layer0X2': {
            customLabel: true,
            dataType: 'number',
            isBucketed: false,
            label: 'Part of count() / overall_sum(count())',
            operationType: 'math',
            params: {
              tinymathAst: 'y-axis-column-layer0X1',
            },
            references: ['y-axis-column-layer0X1'],
            scale: 'ratio',
          },
          'y-axis-column-layer0X3': {
            customLabel: true,
            dataType: 'number',
            isBucketed: false,
            label: 'Part of count() / overall_sum(count())',
            operationType: 'overall_sum',
            references: ['y-axis-column-layer0X2'],
            scale: 'ratio',
          },
          'y-axis-column-layer0X4': {
            customLabel: true,
            dataType: 'number',
            isBucketed: false,
            label: 'Part of count() / overall_sum(count())',
            operationType: 'math',
            params: {
              tinymathAst: {
                args: ['y-axis-column-layer0X0', 'y-axis-column-layer0X3'],
                location: {
                  max: 30,
                  min: 0,
                },
                name: 'divide',
                text:
                  "count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *') / overall_sum(count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *'))",
                type: 'function',
              },
            },
            references: ['y-axis-column-layer0X0', 'y-axis-column-layer0X3'],
            scale: 'ratio',
          },
        },
        incompleteColumns: {},
      });
    });
  });

  describe('Layer Filters', function () {
    it('should return expected filters', function () {
      reportViewConfig.baseFilters?.push(
        ...buildPhrasesFilter('service.name', ['elastic', 'kibana'], mockIndexPattern)
      );

      const layerConfig1: LayerConfig = {
        seriesConfig: reportViewConfig,
        seriesType: 'line',
        operationType: 'count',
        indexPattern: mockIndexPattern,
        reportDefinitions: { 'performance.metric': [LCP_FIELD] },
        time: { from: 'now-15m', to: 'now' },
      };

      const filters = lnsAttr.getLayerFilters(layerConfig1, 2);

      expect(filters).toEqual(
        '@timestamp >= now-15m and @timestamp <= now and transaction.type: page-load and processor.event: transaction and transaction.type : * and service.name: (elastic or kibana)'
      );
    });
  });
});
