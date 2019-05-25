/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { formatnumber } from '../formatnumber';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('formatnumber', () => {
  const fn = functionWrapper(formatnumber);

  it('returns number as formatted string with given format', () => {
    expect(fn(140000, { format: '$0,0.00' })).to.be('$140,000.00');
  });

  describe('args', () => {
    describe('format', () => {
      it('sets the format of the resulting number string', () => {
        expect(fn(0.68, { format: '0.000%' })).to.be('68.000%');
      });

      it('casts number to a string if format is not specified', () => {
        expect(fn(140000.999999)).to.be('140000.999999');
      });
    });
  });
});
