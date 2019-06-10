/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTSVBLink } from './create_tsvb_link';
import { source, options, timeRange } from '../../../utils/fixtures/metrics_explorer';
import uuid from 'uuid';
import { OutputBuffer } from 'uuid/interfaces';
import { MetricsExplorerAggregation } from '../../../../server/routes/metrics_explorer/types';

jest.mock('uuid');
const mockedUuid = uuid as jest.Mocked<typeof uuid>;
mockedUuid.v1.mockReturnValue(('test-id' as unknown) as OutputBuffer);
const series = { id: 'example-01', rows: [], columns: [] };

describe('createTSVBLink()', () => {
  it('should just work', () => {
    const link = createTSVBLink(source, options, series, timeRange);
    expect(link).toBe(
      "../app/kibana#/visualize/create?type=metrics&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))&_a=(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:'host.name: example-01',id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:%233185FC,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))"
    );
  });
  it('should work with rates', () => {
    const customOptions = {
      ...options,
      metrics: [
        { aggregation: MetricsExplorerAggregation.rate, field: 'system.network.out.bytes' },
      ],
    };
    const link = createTSVBLink(source, customOptions, series, timeRange);
    expect(link).toBe(
      "../app/kibana#/visualize/create?type=metrics&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))&_a=(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:'host.name: example-01',id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:%233185FC,fill:0,formatter:bytes,id:test-id,label:'rate(system.network.out.bytes)',line_width:2,metrics:!((field:system.network.out.bytes,id:test-id,type:max),(field:test-id,id:test-id,type:derivative,unit:'1s'),(field:test-id,id:test-id,type:positive_only)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}}/s)),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))"
    );
  });
  it('should work with time range', () => {
    const customTimeRange = { ...timeRange, from: 'now-10m', to: 'now' };
    const link = createTSVBLink(source, options, series, customTimeRange);
    expect(link).toBe(
      "../app/kibana#/visualize/create?type=metrics&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-10m,to:now))&_a=(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:'host.name: example-01',id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:%233185FC,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))"
    );
  });
  it('should work with source', () => {
    const customSource = {
      ...source,
      metricAlias: 'my-beats-*',
      fields: { ...source.fields, timestamp: 'time' },
    };
    const link = createTSVBLink(customSource, options, series, timeRange);
    expect(link).toBe(
      "../app/kibana#/visualize/create?type=metrics&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))&_a=(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_position:left,axis_scale:normal,default_index_pattern:'my-beats-*',filter:'host.name: example-01',id:test-id,index_pattern:'my-beats-*',interval:auto,series:!((axis_position:right,chart_type:line,color:%233185FC,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:time,type:timeseries),title:example-01,type:metrics))"
    );
  });
  it('should work with filterQuery', () => {
    const customSource = {
      ...source,
      metricAlias: 'my-beats-*',
      fields: { ...source.fields, timestamp: 'time' },
    };
    const customOptions = { ...options, filterQuery: 'system.network.name:lo*' };
    const link = createTSVBLink(customSource, customOptions, series, timeRange);
    expect(link).toBe(
      "../app/kibana#/visualize/create?type=metrics&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))&_a=(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_position:left,axis_scale:normal,default_index_pattern:'my-beats-*',filter:'system.network.name:lo* AND host.name: example-01',id:test-id,index_pattern:'my-beats-*',interval:auto,series:!((axis_position:right,chart_type:line,color:%233185FC,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:time,type:timeseries),title:example-01,type:metrics))"
    );
  });
});
