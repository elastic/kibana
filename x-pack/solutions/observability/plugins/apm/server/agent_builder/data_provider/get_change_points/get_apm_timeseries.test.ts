/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { ApmTimeseriesType, getApmTimeseriesRt } from './get_apm_timeseries';

function baseStat(timeseries: Record<string, unknown>) {
  return {
    stats: [
      {
        'service.name': 'opbeans-java',
        title: 'Latency',
        timeseries,
      },
    ],
    start: 'now-15m',
    end: 'now',
  };
}

describe('getApmTimeseriesRt (agent_builder data provider)', () => {
  it('parses a transaction throughput stat', () => {
    const result = getApmTimeseriesRt.safeParse(
      baseStat({ name: ApmTimeseriesType.transactionThroughput })
    );

    expectParseSuccess(result);
  });

  it('parses an error event rate stat', () => {
    const result = getApmTimeseriesRt.safeParse(
      baseStat({ name: ApmTimeseriesType.errorEventRate })
    );

    expectParseSuccess(result);
  });

  it('rejects an unknown timeseries name', () => {
    const result = getApmTimeseriesRt.safeParse(baseStat({ name: 'not_a_real_type' }));

    expectParseError(result);
  });

  it('rejects a missing required field', () => {
    const result = getApmTimeseriesRt.safeParse({
      stats: [{ title: 'Latency', timeseries: { name: ApmTimeseriesType.errorEventRate } }],
      start: 'now-15m',
      end: 'now',
    });

    expectParseError(result);
  });
});
