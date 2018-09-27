/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

import { getAgentMarks } from './get_agent_marks';

describe('getAgentMarks', () => {
  it('should be sorted', () => {
    const transaction = {
      transaction: {
        duration: {
          us: 1000
        },
        marks: {
          agent: {
            domInteractive: 117,
            timeToFirstByte: 10,
            domComplete: 118
          }
        }
      }
    };
    expect(getAgentMarks(transaction)).toEqual([
      { name: 'timeToFirstByte', timeLabel: 10000, timeAxis: 10000 },
      { name: 'domInteractive', timeLabel: 117000, timeAxis: 117000 },
      { name: 'domComplete', timeLabel: 118000, timeAxis: 118000 }
    ]);
  });

  it('should ensure they are not too close', () => {
    const transaction = {
      transaction: {
        duration: {
          us: 1000 * 1000
        },
        marks: {
          agent: {
            a: 0,
            b: 10,
            c: 11,
            d: 12,
            e: 968,
            f: 969,
            timeToFirstByte: 970,
            domInteractive: 980,
            domComplete: 990
          }
        }
      }
    };
    expect(getAgentMarks(transaction)).toEqual([
      { timeLabel: 0, name: 'a', timeAxis: 0 },
      { timeLabel: 10000, name: 'b', timeAxis: 20000 },
      { timeLabel: 11000, name: 'c', timeAxis: 40000 },
      { timeLabel: 12000, name: 'd', timeAxis: 60000 },
      { timeLabel: 968000, name: 'e', timeAxis: 910000 },
      { timeLabel: 969000, name: 'f', timeAxis: 930000 },
      { timeLabel: 970000, name: 'timeToFirstByte', timeAxis: 950000 },
      { timeLabel: 980000, name: 'domInteractive', timeAxis: 970000 },
      { timeLabel: 990000, name: 'domComplete', timeAxis: 990000 }
    ]);
  });
});
