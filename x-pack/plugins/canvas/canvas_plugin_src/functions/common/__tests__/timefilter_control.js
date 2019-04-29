/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { timefilterControl } from '../timefilterControl';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('timefilterControl', () => {
  const fn = functionWrapper(timefilterControl);

  it('returns a render as time_filter', () => {
    expect(fn(null, { column: 'time', compact: false }))
      .to.have.property('type', 'render')
      .and.to.have.property('as', 'time_filter');
  });

  describe('args', () => {
    describe('column', () => {
      it('set the column the filter is applied to', () => {
        expect(fn(null, { column: 'time' }).value).to.have.property('column', 'time');
      });
    });
  });

  it('set if time filter displays in compact mode', () => {
    expect(fn(null, { compact: false }).value).to.have.property('compact', false);
    expect(fn(null, { compact: true }).value).to.have.property('compact', true);
  });

  it('defaults time filter display to compact mode', () => {
    expect(fn(null).value).to.have.property('compact', true);
  });
});
