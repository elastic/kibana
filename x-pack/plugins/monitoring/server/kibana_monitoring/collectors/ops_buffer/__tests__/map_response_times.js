/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { mapResponseTimes } from '../map_response_times';
import expect from '@kbn/expect';

describe('Map response times', () => {
  it('flatten ports', () => {
    const responseTimes = { '5603': { avg: 30, max: 250 } };
    const expected = { average: 30, max: 250 };
    expect(isEqual(mapResponseTimes(responseTimes), expected)).to.be(true);
  });

  it('combine empty', () => {
    const responseTimes = {};
    const expected = { average: 0, max: 0 };
    expect(isEqual(mapResponseTimes(responseTimes), expected)).to.be(true);
  });

  it('combine results', () => {
    const responseTimes = {
      '5600': {
        avg: 1,
        max: 10
      },
      '5602': {
        avg: 3,
        max: 200
      }
    };
    const expected = { average: 3, max: 200 };
    expect(isEqual(mapResponseTimes(responseTimes), expected)).to.be(true);
  });

  it('combine results with different maximums for average and max value', () => {
    const responseTimes = {
      '5600': {
        avg: 5,
        max: 10
      },
      '5602': {
        avg: 3,
        max: 200
      },
      '5604': {
        // no average
        max: 105
      }
    };
    const expected = { average: 5, max: 200 };
    expect(isEqual(mapResponseTimes(responseTimes), expected)).to.be(true);
  });
});
