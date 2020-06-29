/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { canInheritTimeRange } from './can_inherit_time_range';
/** eslint-disable */
import { HelloWorldContainer } from '../../../../src/plugins/embeddable/public/lib/test_samples';
import { HelloWorldEmbeddable } from '../../../../examples/embeddable_examples/public';
/** eslint-enable */
import { TimeRangeEmbeddable, TimeRangeContainer } from './test_helpers';

jest.mock('ui/new_platform');

test('canInheritTimeRange returns false if embeddable is inside container without a time range', () => {
  const embeddable = new TimeRangeEmbeddable(
    { id: '1234', timeRange: { from: 'noxw-15m', to: 'now' } },
    new HelloWorldContainer({ id: '123', panels: {} }, (() => null) as any)
  );

  expect(canInheritTimeRange(embeddable)).toBe(false);
});

test('canInheritTimeRange returns false if embeddable is without a time range', () => {
  const embeddable = new HelloWorldEmbeddable(
    { id: '1234' },
    new HelloWorldContainer({ id: '123', panels: {} }, (() => null) as any)
  );
  // @ts-ignore
  expect(canInheritTimeRange(embeddable)).toBe(false);
});

test('canInheritTimeRange returns true if embeddable is inside a container with a time range', () => {
  const embeddable = new TimeRangeEmbeddable(
    { id: '1234', timeRange: { from: 'noxw-15m', to: 'now' } },
    new TimeRangeContainer(
      { id: '123', panels: {}, timeRange: { from: 'noxw-15m', to: 'now' } },
      (() => null) as any
    )
  );
  expect(canInheritTimeRange(embeddable)).toBe(true);
});
