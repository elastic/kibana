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
      missingBucket: false,
    });
    expect(agg).toMatchSnapshot();
  });

  it('should include missing bucket configuration for aggregation if configured', () => {
    const groupByFields = ['host.name'];
    const maxSignals = 100;

    const agg = buildGroupByFieldAggregation({
      groupByFields,
      maxSignals,
      aggregatableTimestampField: 'kibana.combined_timestamp',
      missingBucket: true,
    });
    expect(agg.eventGroups.composite.sources[0]['host.name'].terms).toEqual({
      field: 'host.name',
      missing_bucket: true,
      missing_order: 'last',
    });
  });

  it('should not include missing bucket configuration for aggregation if not configured', () => {
    const groupByFields = ['host.name'];
    const maxSignals = 100;

    const agg = buildGroupByFieldAggregation({
      groupByFields,
      maxSignals,
      aggregatableTimestampField: 'kibana.combined_timestamp',
      missingBucket: false,
    });
    expect(agg.eventGroups.composite.sources[0]['host.name'].terms).toEqual({
      field: 'host.name',
    });
  });
});
