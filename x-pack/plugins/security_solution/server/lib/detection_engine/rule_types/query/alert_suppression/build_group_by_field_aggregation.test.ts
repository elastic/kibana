/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildGroupByFieldAggregation } from './build_group_by_field_aggregation';

describe('build_group_by_field_aggregation', () => {
  it('Build Group-by-field aggregation', () => {
    const groupByFields = ['host.name'];
    const maxSignals = 100;

    const agg = buildGroupByFieldAggregation({
      groupByFields,
      maxSignals,
      aggregatableTimestampField: 'kibana.combined_timestamp',
    });
    expect(agg).toMatchSnapshot();
  });
});
