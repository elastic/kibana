/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTSVBLink, createFilterFromOptions } from './create_tsvb_link';
import {
  source,
  options,
  timeRange,
  chartOptions,
} from '../../../../../utils/fixtures/metrics_explorer';
import uuid from 'uuid';
import { OutputBuffer } from 'uuid/interfaces';
import {
  MetricsExplorerYAxisMode,
  MetricsExplorerChartType,
} from '../../hooks/use_metrics_explorer_options';
import { MetricsExplorerOptions } from '../../hooks/use_metrics_explorer_options';

jest.mock('uuid');
const mockedUuid = uuid as jest.Mocked<typeof uuid>;
mockedUuid.v1.mockReturnValue('test-id' as unknown as OutputBuffer);
const series = { id: 'example-01', rows: [], columns: [] };

describe('createTSVBLink()', () => {
  it('should just work', () => {
    const link = createTSVBLink(source, options, series, timeRange, chartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#6092C0,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });

  it('should work with rates', () => {
    const customOptions: MetricsExplorerOptions = {
      ...options,
      metrics: [{ aggregation: 'rate', field: 'system.network.out.bytes' }],
    };
    const link = createTSVBLink(source, customOptions, series, timeRange, chartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#6092C0,fill:0,formatter:bytes,id:test-id,label:'rate(system.network.out.bytes)',line_width:2,metrics:!((field:system.network.out.bytes,id:test-id,type:max),(field:test-id,id:test-id,type:derivative,unit:'1s'),(field:test-id,id:test-id,type:positive_only)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}}/s)),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });
  it('should work with time range', () => {
    const customTimeRange = { ...timeRange, from: 'now-10m', to: 'now' };
    const link = createTSVBLink(source, options, series, customTimeRange, chartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#6092C0,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-10m,to:now))',
        type: 'metrics',
      },
    });
  });
  it('should work with source', () => {
    const customSource = {
      ...source,
      metricAlias: 'my-beats-*',
      fields: { ...source.fields, timestamp: 'time' },
    };
    const link = createTSVBLink(customSource, options, series, timeRange, chartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'my-beats-*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'my-beats-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#6092C0,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });
  it('should work with filterQuery', () => {
    const customSource = {
      ...source,
      metricAlias: 'my-beats-*',
      fields: { ...source.fields, timestamp: 'time' },
    };
    const customOptions = { ...options, filterQuery: 'system.network.name:lo*' };
    const link = createTSVBLink(customSource, customOptions, series, timeRange, chartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'my-beats-*',filter:(language:kuery,query:'system.network.name:lo* and host.name : \"example-01\"'),id:test-id,index_pattern:'my-beats-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#6092C0,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });

  it('should remove axis_min from link', () => {
    const customChartOptions = { ...chartOptions, yAxisMode: MetricsExplorerYAxisMode.auto };
    const link = createTSVBLink(source, options, series, timeRange, customChartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#6092C0,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });

  it('should change series to area', () => {
    const customChartOptions = { ...chartOptions, type: MetricsExplorerChartType.area };
    const link = createTSVBLink(source, options, series, timeRange, customChartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#6092C0,fill:0.5,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });

  it('should change series to area and stacked', () => {
    const customChartOptions = {
      ...chartOptions,
      type: MetricsExplorerChartType.area,
      stack: true,
    };
    const link = createTSVBLink(source, options, series, timeRange, customChartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#6092C0,fill:0.5,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:stacked,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });

  it('should use the workaround index pattern when there are multiple listed in the source', () => {
    const customSource = {
      ...source,
      metricAlias: 'my-beats-*,metrics-*',
      fields: { ...source.fields, timestamp: 'time' },
    };
    const link = createTSVBLink(customSource, options, series, timeRange, chartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'metric*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metric*',interval:auto,series:!((axis_position:right,chart_type:line,color:#6092C0,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });

  test('createFilterFromOptions()', () => {
    const customOptions = { ...options, groupBy: 'host.name' };
    const customSeries = { ...series, id: 'test"foo' };
    expect(createFilterFromOptions(customOptions, customSeries)).toEqual({
      language: 'kuery',
      query: 'host.name : "test\\"foo"',
    });
  });
});
