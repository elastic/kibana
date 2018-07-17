/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAgentMarks } from '../view';

describe('TransactionDetailsView', () => {
  describe('getAgentMarks', () => {
    it('should be sorted', () => {
      const transaction = {
        transaction: {
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
        { name: 'timeToFirstByte', label: 10, us: 10000 },
        { name: 'domInteractive', label: 117, us: 117000 },
        { name: 'domComplete', label: 118, us: 118000 }
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
        { label: 0, name: 'a', us: 0 },
        { label: 10, name: 'b', us: 20000 },
        { label: 11, name: 'c', us: 40000 },
        { label: 12, name: 'd', us: 60000 },
        { label: 968, name: 'e', us: 910000 },
        { label: 969, name: 'f', us: 930000 },
        { label: 970, name: 'timeToFirstByte', us: 950000 },
        { label: 980, name: 'domInteractive', us: 970000 },
        { label: 990, name: 'domComplete', us: 990000 }
      ]);
    });
  });
});
