/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
import { getAgentMarks } from './get_agent_marks';

describe('getAgentMarks', () => {
<<<<<<< HEAD
  it('should sort the marks', () => {
=======
  it('should sort the marks by time', () => {
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    const transaction: Transaction = {
      transaction: {
        marks: {
          agent: {
            domInteractive: 117,
            timeToFirstByte: 10,
            domComplete: 118
          }
        }
      }
    } as any;
    expect(getAgentMarks(transaction)).toEqual([
      { name: 'timeToFirstByte', us: 10000 },
      { name: 'domInteractive', us: 117000 },
      { name: 'domComplete', us: 118000 }
    ]);
  });

  it('should return empty array if marks are missing', () => {
    const transaction: Transaction = {
      transaction: {}
    } as any;
    expect(getAgentMarks(transaction)).toEqual([]);
  });
<<<<<<< HEAD
=======

  it('should return empty array if agent marks are missing', () => {
    const transaction: Transaction = {
      transaction: { marks: {} }
    } as any;
    expect(getAgentMarks(transaction)).toEqual([]);
  });
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
});
