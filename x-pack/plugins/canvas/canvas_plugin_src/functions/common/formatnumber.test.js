/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { formatnumber } from './formatnumber';

describe('formatnumber', () => {
  const fn = functionWrapper(formatnumber);

  it('returns number as formatted string with given format', () => {
    expect(fn(140000, { format: '$0,0.00' })).toBe('$140,000.00');
  });

  describe('args', () => {
    describe('format', () => {
      it('sets the format of the resulting number string', () => {
        expect(fn(0.68, { format: '0.000%' })).toBe('68.000%');
      });

      it('casts number to a string if format is not specified', () => {
        expect(fn(140000.999999)).toBe('140000.999999');
      });
    });
  });
});
