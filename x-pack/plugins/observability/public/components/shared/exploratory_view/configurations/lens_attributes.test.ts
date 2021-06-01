/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAttributes } from './lens_attributes';
import { mockAppIndexPattern, mockIndexPattern } from '../rtl_helpers';
import { getDefaultConfigs } from './default_configs';
import { sampleAttribute } from './test_data/sample_attribute';
import { LCP_FIELD, SERVICE_NAME, USER_AGENT_NAME } from './constants/elasticsearch_fieldnames';

describe('Lens Attribute', () => {
  mockAppIndexPattern();

  const reportViewConfig = getDefaultConfigs({
    reportType: 'pld',
    indexPattern: mockIndexPattern,
    seriesId: 'series-id',
  });

  let lnsAttr: LensAttributes;

  beforeEach(() => {
    lnsAttr = new LensAttributes(mockIndexPattern, reportViewConfig, 'line', [], 'count', {});
  });

  it('should return expected json', function () {
    expect(lnsAttr.getJSON()).toEqual(sampleAttribute);
  });

  it('should return main y axis', function () {
    expect(lnsAttr.getMainYAxis()).toEqual({
      dataType: 'number',
      isBucketed: false,
      label: 'Pages loaded',
      operationType: 'count',
      scale: 'ratio',
      sourceField: 'Records',
    });
  });

  it('should return expected field type', function () {
    expect(JSON.stringify(lnsAttr.getFieldMeta('transaction.type'))).toEqual(
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
    expect(JSON.stringify(lnsAttr.getFieldMeta('performance.metric'))).toEqual(
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
      })
    );
  });

  it('should return expected field type for custom field with passed value', function () {
    lnsAttr = new LensAttributes(mockIndexPattern, reportViewConfig, 'line', [], 'count', {
      'performance.metric': [LCP_FIELD],
    });

    expect(JSON.stringify(lnsAttr.getFieldMeta('performance.metric'))).toEqual(
      JSON.stringify({
        fieldMeta: {
          count: 0,
          name: LCP_FIELD,
          type: 'number',
          esTypes: ['scaled_float'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
        },
        fieldName: LCP_FIELD,
      })
    );
  });

  it('should return expected number range column', function () {
    expect(lnsAttr.getNumberRangeColumn('transaction.duration.us')).toEqual({
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
    expect(lnsAttr.getNumberRangeColumn('transaction.duration.us')).toEqual({
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
    expect(lnsAttr.getXAxis()).toEqual({
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
    expect(lnsAttr.getLayer()).toEqual({
      columnOrder: ['x-axis-column', 'y-axis-column'],
      columns: {
        'x-axis-column': {
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
        'y-axis-column': {
          dataType: 'number',
          isBucketed: false,
          label: 'Pages loaded',
          operationType: 'count',
          scale: 'ratio',
          sourceField: 'Records',
        },
      },
      incompleteColumns: {},
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
          accessors: ['y-axis-column'],
          layerId: 'layer1',
          palette: undefined,
          seriesType: 'line',
          xAccessor: 'x-axis-column',
          yConfig: [{ color: 'green', forAccessor: 'y-axis-column' }],
        },
      ],
      legend: { isVisible: true, position: 'right' },
      preferredSeriesType: 'line',
      tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
      valueLabels: 'hide',
    });
  });

  describe('ParseFilters function', function () {
    it('should parse default filters', function () {
      expect(lnsAttr.parseFilters()).toEqual([
        { meta: { index: 'apm-*' }, query: { match_phrase: { 'transaction.type': 'page-load' } } },
        { meta: { index: 'apm-*' }, query: { match_phrase: { 'processor.event': 'transaction' } } },
      ]);
    });

    it('should parse default and ui filters', function () {
      lnsAttr = new LensAttributes(
        mockIndexPattern,
        reportViewConfig,
        'line',
        [
          { field: SERVICE_NAME, values: ['elastic-co', 'kibana-front'] },
          { field: USER_AGENT_NAME, values: ['Firefox'], notValues: ['Chrome'] },
        ],
        'count',
        {}
      );

      expect(lnsAttr.parseFilters()).toEqual([
        { meta: { index: 'apm-*' }, query: { match_phrase: { 'transaction.type': 'page-load' } } },
        { meta: { index: 'apm-*' }, query: { match_phrase: { 'processor.event': 'transaction' } } },
        {
          meta: {
            index: 'apm-*',
            key: 'service.name',
            params: ['elastic-co', 'kibana-front'],
            type: 'phrases',
            value: 'elastic-co, kibana-front',
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match_phrase: {
                    'service.name': 'elastic-co',
                  },
                },
                {
                  match_phrase: {
                    'service.name': 'kibana-front',
                  },
                },
              ],
            },
          },
        },
        {
          meta: {
            index: 'apm-*',
          },
          query: {
            match_phrase: {
              'user_agent.name': 'Firefox',
            },
          },
        },
        {
          meta: {
            index: 'apm-*',
            negate: true,
          },
          query: {
            match_phrase: {
              'user_agent.name': 'Chrome',
            },
          },
        },
      ]);
    });
  });

  describe('Layer breakdowns', function () {
    it('should add breakdown column', function () {
      lnsAttr.addBreakdown(USER_AGENT_NAME);

      expect(lnsAttr.visualization.layers).toEqual([
        {
          accessors: ['y-axis-column'],
          layerId: 'layer1',
          palette: undefined,
          seriesType: 'line',
          splitAccessor: 'break-down-column',
          xAccessor: 'x-axis-column',
          yConfig: [{ color: 'green', forAccessor: 'y-axis-column' }],
        },
      ]);

      expect(lnsAttr.layers.layer1).toEqual({
        columnOrder: ['x-axis-column', 'break-down-column', 'y-axis-column'],
        columns: {
          'break-down-column': {
            dataType: 'string',
            isBucketed: true,
            label: 'Top values of Browser family',
            operationType: 'terms',
            params: {
              missingBucket: false,
              orderBy: { columnId: 'y-axis-column', type: 'column' },
              orderDirection: 'desc',
              otherBucket: true,
              size: 3,
            },
            scale: 'ordinal',
            sourceField: 'user_agent.name',
          },
          'x-axis-column': {
            dataType: 'number',
            isBucketed: true,
            label: 'Page load time',
            operationType: 'range',
            params: {
              maxBars: 'auto',
              ranges: [{ from: 0, label: '', to: 1000 }],
              type: 'histogram',
            },
            scale: 'interval',
            sourceField: 'transaction.duration.us',
          },
          'y-axis-column': {
            dataType: 'number',
            isBucketed: false,
            label: 'Pages loaded',
            operationType: 'count',
            scale: 'ratio',
            sourceField: 'Records',
          },
        },
        incompleteColumns: {},
      });
    });

    it('should remove breakdown column', function () {
      lnsAttr.addBreakdown(USER_AGENT_NAME);

      lnsAttr.removeBreakdown();

      expect(lnsAttr.visualization.layers).toEqual([
        {
          accessors: ['y-axis-column'],
          layerId: 'layer1',
          palette: undefined,
          seriesType: 'line',
          xAccessor: 'x-axis-column',
          yConfig: [{ color: 'green', forAccessor: 'y-axis-column' }],
        },
      ]);

      expect(lnsAttr.layers.layer1.columnOrder).toEqual(['x-axis-column', 'y-axis-column']);

      expect(lnsAttr.layers.layer1.columns).toEqual({
        'x-axis-column': {
          dataType: 'number',
          isBucketed: true,
          label: 'Page load time',
          operationType: 'range',
          params: {
            maxBars: 'auto',
            ranges: [{ from: 0, label: '', to: 1000 }],
            type: 'histogram',
          },
          scale: 'interval',
          sourceField: 'transaction.duration.us',
        },
        'y-axis-column': {
          dataType: 'number',
          isBucketed: false,
          label: 'Pages loaded',
          operationType: 'count',
          scale: 'ratio',
          sourceField: 'Records',
        },
      });
    });
  });
});
