/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCombinedKqlQuery } from './build_kql_query';

describe('buildCombinedKqlQuery', () => {
  const testData = [
    {
      title: 'no selected groups, with kql',
      props: {
        groups: [],
        groupBy: 'slo.tags',
        kqlQuery: 'status:"VIOLATED"',
      },
    },
    {
      title: 'selected groups, with kql',
      props: {
        groups: ['production', 'dev'],
        groupBy: 'slo.tags',
        kqlQuery: 'status:"VIOLATED"',
      },
    },
    {
      title: 'selected groups, no kql',
      props: {
        groups: ['production', 'dev'],
        groupBy: 'slo.tags',
        kqlQuery: '',
      },
    },
    {
      title: 'no selected groups, no kql',
      props: {
        groups: [],
        groupBy: 'slo.tags',
        kqlQuery: '',
      },
    },
  ];

  test.each(testData)('should generate correct es query for $title', ({ props }) => {
    expect(buildCombinedKqlQuery(props)).toMatchSnapshot();
  });
});
