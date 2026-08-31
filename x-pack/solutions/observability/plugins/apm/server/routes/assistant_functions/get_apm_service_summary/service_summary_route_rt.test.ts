/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { serviceSummaryRouteRt } from '.';

describe('serviceSummaryRouteRt', () => {
  it('parses required fields without the optional ones', () => {
    const result = serviceSummaryRouteRt.safeParse({
      'service.name': 'opbeans-java',
      start: 'now-15m',
      end: 'now',
    });

    expectParseSuccess(result);
    expect(result.data).toEqual({
      'service.name': 'opbeans-java',
      start: 'now-15m',
      end: 'now',
    });
  });

  it('parses the optional environment/transaction type when provided', () => {
    const result = serviceSummaryRouteRt.safeParse({
      'service.name': 'opbeans-java',
      'service.environment': 'production',
      'transaction.type': 'request',
      start: 'now-15m',
      end: 'now',
    });

    expectParseSuccess(result);
    expect(result.data['service.environment']).toEqual('production');
    expect(result.data['transaction.type']).toEqual('request');
  });

  it('rejects a missing required field', () => {
    const result = serviceSummaryRouteRt.safeParse({
      start: 'now-15m',
      end: 'now',
    });

    expectParseError(result);
  });
});
