/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from './build_es_query';

describe('buildEsQuery', () => {
  const from = '2022-08-30T15:23:23.721Z';
  const to = '2022-08-30T15:38:28.171Z';
  const defaultTimeRange = {
    from,
    to,
  };
  const testData = [
    {
      timeRange: defaultTimeRange,
      kuery: '',
    },
    {
      timeRange: defaultTimeRange,
    },
    {
      timeRange: defaultTimeRange,
      kuery: 'nestedField: { child: "something" }',
    },
    {
      timeRange: defaultTimeRange,
      kuery: 'kibana.alert.status: "active"',
    },
    {
      timeRange: defaultTimeRange,
      kuery: 'kibana.alert.status: "recovered" and kibana.alert.duration.us >= 120',
    },
  ];

  test.each(testData)('should generate correct es query for %j', ({ kuery, timeRange }) => {
    expect(buildEsQuery(timeRange, kuery)).toMatchSnapshot();
  });
});
