/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getMoment } from '../get_moment';

describe('get_moment', () => {

  describe('getMoment', () => {

    it(`returns a moment object when passed a date`, () => {
      const moment = getMoment('2017-03-30T14:53:08.121Z');

      expect(moment.constructor.name).to.be('Moment');
    });

    it(`returns null when passed falsy`, () => {
      const results = [
        getMoment(false),
        getMoment(0),
        getMoment(''),
        getMoment(null),
        getMoment(undefined),
        getMoment(NaN)
      ];

      results.forEach(result => {
        expect(result).to.be(null);
      });
    });

  });

});
