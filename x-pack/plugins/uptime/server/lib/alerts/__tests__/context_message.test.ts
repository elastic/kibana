/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { contextMessage } from '../status_check';
import { GetMonitorStatusResult } from '../../requests';

describe('contextMessage', () => {
  let items: GetMonitorStatusResult[];
  beforeEach(() => {
    items = [
      {
        monitor_id: 'first',
        location: 'harrisburg',
        count: 234,
        status: 'down',
      },
      {
        monitor_id: 'first',
        location: 'fairbanks',
        count: 312,
        status: 'down',
      },
      {
        monitor_id: 'second',
        location: 'harrisburg',
        count: 325,
        status: 'down',
      },
      {
        monitor_id: 'second',
        location: 'fairbanks',
        count: 331,
        status: 'down',
      },
      {
        monitor_id: 'third',
        location: 'harrisburg',
        count: 331,
        status: 'down',
      },
      {
        monitor_id: 'third',
        location: 'fairbanks',
        count: 342,
        status: 'down',
      },
      {
        monitor_id: 'fourth',
        location: 'harrisburg',
        count: 355,
        status: 'down',
      },
      {
        monitor_id: 'fourth',
        location: 'fairbanks',
        count: 342,
        status: 'down',
      },
      {
        monitor_id: 'fifth',
        location: 'harrisburg',
        count: 342,
        status: 'down',
      },
      {
        monitor_id: 'fifth',
        location: 'fairbanks',
        count: 342,
        status: 'down',
      },
    ];
  });

  it('creates a message with appropriate number of monitors', () => {
    expect(contextMessage(items, 3)).toBe(
      'Down monitors:\nfirst\nsecond\nthird\n...and 2 other monitors'
    );
  });

  it('throws an error if `max` is less than 2', () => {
    expect(() => contextMessage(items, 1)).toThrowErrorMatchingInlineSnapshot(
      '"Maximum value must be greater than 2, received 1."'
    );
  });

  it('returns only the ids if length < max', () => {
    expect(contextMessage(items.slice(0, 3), 3)).toBe('Down monitors:\nfirst\nsecond');
  });

  it('returns a default message when no monitors are provided', () => {
    expect(contextMessage([], 3)).toMatchInlineSnapshot(`"No down monitor IDs received"`);
  });
});
