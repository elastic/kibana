/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// test error conditions of calling timeSeriesQuery - postive results tested in FT

import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { TimeSeriesQueryParameters, TimeSeriesQuery, timeSeriesQuery } from './time_series_query';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../../src/core/server/elasticsearch/client/mocks';

const DefaultQueryParams: TimeSeriesQuery = {
  index: 'index-name',
  timeField: 'time-field',
  aggType: 'count',
  aggField: undefined,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  dateStart: undefined,
  dateEnd: undefined,
  interval: undefined,
  groupBy: 'all',
  termField: undefined,
  termSize: undefined,
};

describe('timeSeriesQuery', () => {
  let params: TimeSeriesQueryParameters;
  const esClient = elasticsearchClientMock.createClusterClient().asScoped().asCurrentUser;

  beforeEach(async () => {
    params = {
      logger: loggingSystemMock.create().get(),
      esClient,
      query: DefaultQueryParams,
    };
  });

  it('fails as expected when the callCluster call fails', async () => {
    esClient.search = jest.fn().mockRejectedValue(new Error('woopsie'));
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
