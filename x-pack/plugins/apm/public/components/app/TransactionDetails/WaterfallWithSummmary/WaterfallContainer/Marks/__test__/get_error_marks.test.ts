/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IWaterfallError } from '../../Waterfall/waterfall_helpers/waterfall_helpers';
import { getErrorMarks } from '../get_error_marks';

describe('getErrorMarks', () => {
  describe('returns empty array', () => {
    it('when items are missing', () => {
      expect(getErrorMarks([], {})).toEqual([]);
    });
  });

  it('returns error marks', () => {
    const items = [
      {
        docType: 'error',
        offset: 10,
        skew: 5,
        doc: { error: { id: 1 }, service: { name: 'opbeans-java' } },
      } as unknown,
      {
        docType: 'error',
        offset: 50,
        skew: 0,
        doc: { error: { id: 2 }, service: { name: 'opbeans-node' } },
      } as unknown,
    ] as IWaterfallError[];
    expect(
      getErrorMarks(items, { 'opbeans-java': 'red', 'opbeans-node': 'blue' })
    ).toEqual([
      {
        type: 'errorMark',
        offset: 15,
        verticalLine: false,
        id: 1,
        error: { error: { id: 1 }, service: { name: 'opbeans-java' } },
        serviceColor: 'red',
      },
      {
        type: 'errorMark',
        offset: 50,
        verticalLine: false,
        id: 2,
        error: { error: { id: 2 }, service: { name: 'opbeans-node' } },
        serviceColor: 'blue',
      },
    ]);
  });

  it('returns error marks without service color', () => {
    const items = [
      {
        docType: 'error',
        offset: 10,
        skew: 5,
        doc: { error: { id: 1 }, service: { name: 'opbeans-java' } },
      } as unknown,
      {
        docType: 'error',
        offset: 50,
        skew: 0,
        doc: { error: { id: 2 }, service: { name: 'opbeans-node' } },
      } as unknown,
    ] as IWaterfallError[];
    expect(getErrorMarks(items, {})).toEqual([
      {
        type: 'errorMark',
        offset: 15,
        verticalLine: false,
        id: 1,
        error: { error: { id: 1 }, service: { name: 'opbeans-java' } },
        serviceColor: undefined,
      },
      {
        type: 'errorMark',
        offset: 50,
        verticalLine: false,
        id: 2,
        error: { error: { id: 2 }, service: { name: 'opbeans-node' } },
        serviceColor: undefined,
      },
    ]);
  });
});
