/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { timefilterControl } from './timefilterControl';

describe('timefilterControl', () => {
  const fn = functionWrapper(timefilterControl);

  it('returns a render as time_filter', () => {
    expect(fn(null, { column: 'time', compact: false })).toHaveProperty('type', 'render');
    expect(fn(null, { column: 'time', compact: false })).toHaveProperty('as', 'time_filter');
  });

  describe('args', () => {
    describe('column', () => {
      it('set the column the filter is applied to', () => {
        expect(fn(null, { column: 'time' }).value).toHaveProperty('column', 'time');
      });
    });
  });

  it('set if time filter displays in compact mode', () => {
    expect(fn(null, { compact: false }).value).toHaveProperty('compact', false);
    expect(fn(null, { compact: true }).value).toHaveProperty('compact', true);
  });

  it('defaults time filter display to compact mode', () => {
    expect(fn(null).value).toHaveProperty('compact', true);
  });
});
