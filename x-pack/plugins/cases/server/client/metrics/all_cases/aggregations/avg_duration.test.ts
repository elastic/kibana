/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AverageDuration } from './avg_duration';

describe('AverageDuration', () => {
  it('returns the correct aggregation', async () => {
    const agg = new AverageDuration();

    expect(agg.build()).toEqual({
      mttr: {
        avg: {
          field: 'cases.attributes.duration',
        },
      },
    });
  });

  it('formats the response correctly', async () => {
    const agg = new AverageDuration();
    const res = agg.formatResponse({ mttr: { value: 5 } });
    expect(res).toEqual({ mttr: 5 });
  });

  it('formats the response correctly if the res is undefined', async () => {
    const agg = new AverageDuration();
    // @ts-expect-error
    const res = agg.formatResponse();
    expect(res).toEqual({ mttr: null });
  });

  it('formats the response correctly if the mttr is not defined', async () => {
    const agg = new AverageDuration();
    const res = agg.formatResponse({});
    expect(res).toEqual({ mttr: null });
  });

  it('formats the response correctly if the value is not defined', async () => {
    const agg = new AverageDuration();
    const res = agg.formatResponse({ mttr: {} });
    expect(res).toEqual({ mttr: null });
  });

  it('gets the name correctly', async () => {
    const agg = new AverageDuration();
    expect(agg.getName()).toBe('mttr');
  });
});
