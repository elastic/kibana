/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { buildNewTermsAggregation } from './build_new_terms_aggregation';

describe('buildNewTermsAggregation', () => {
  test('builds a correct aggregation with event.ingested', () => {
    const newValueWindowStart = moment(1650935705);
    const aggregation = buildNewTermsAggregation({
      newValueWindowStart,
      field: 'host.name',
      maxSignals: 50,
      timestampField: 'event.ingested',
    });

    expect(aggregation).toMatchSnapshot();
  });

  test('builds a correct aggregation with @timestamp', () => {
    const newValueWindowStart = moment(1650000000);
    const aggregation = buildNewTermsAggregation({
      newValueWindowStart,
      field: 'host.ip',
      maxSignals: 200,
      timestampField: '@timestamp',
    });

    expect(aggregation).toMatchSnapshot();
  });
});
