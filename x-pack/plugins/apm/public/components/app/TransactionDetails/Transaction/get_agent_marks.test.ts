/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
import { getAgentMarks } from './get_agent_marks';

describe('getAgentMarks', () => {
  it('should sort the marks', () => {
    const transaction = ({
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
    } as any) as Transaction;
    expect(getAgentMarks(transaction)).toEqual([
      { name: 'timeToFirstByte', us: 10000 },
      { name: 'domInteractive', us: 117000 },
      { name: 'domComplete', us: 118000 }
    ]);
  });
});
