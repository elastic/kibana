/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// test error conditions of calling timeSeriesQuery - postive results tested in FT

import { loggingServiceMock } from '../../../../../../../src/core/server/mocks';
import { coreMock } from '../../../../../../../src/core/server/mocks';
import { AlertingBuiltinsPlugin } from '../../../plugin';
import { TimeSeriesQueryParameters, TimeSeriesResult } from './time_series_query';

type TimeSeriesQuery = (params: TimeSeriesQueryParameters) => Promise<TimeSeriesResult>;

const DefaultQueryParams = {
  index: 'index-name',
  timeField: 'time-field',
  aggType: 'count',
  aggField: undefined,
  window: '5m',
  dateStart: undefined,
  dateEnd: undefined,
  interval: undefined,
  groupField: undefined,
  groupLimit: undefined,
};

describe('timeSeriesQuery', () => {
  let params: TimeSeriesQueryParameters;
  const mockCallCluster = jest.fn();

  let timeSeriesQuery: TimeSeriesQuery;

  beforeEach(async () => {
    // rather than use the function from an import, retrieve it from the plugin
    const context = coreMock.createPluginInitializerContext();
    const plugin = new AlertingBuiltinsPlugin(context);
    const coreStart = coreMock.createStart();
    const service = await plugin.start(coreStart);
    timeSeriesQuery = service.indexThreshold.timeSeriesQuery;

    mockCallCluster.mockReset();
    params = {
      logger: loggingServiceMock.create().get(),
      callCluster: mockCallCluster,
      query: { ...DefaultQueryParams },
    };
  });

  it('fails as expected when the callCluster call fails', async () => {
    mockCallCluster.mockRejectedValue(new Error('woopsie'));
    expect(timeSeriesQuery(params)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error running search"`
    );
  });

  it('fails as expected when the query params are invalid', async () => {
    params.query = { ...params.query, dateStart: 'x' };
    expect(timeSeriesQuery(params)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"invalid date format for dateStart: \\"x\\""`
    );
  });
});
