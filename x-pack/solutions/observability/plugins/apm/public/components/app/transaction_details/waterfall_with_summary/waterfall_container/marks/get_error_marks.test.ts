/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IWaterfallError } from '../waterfall/waterfall_helpers/waterfall_helpers';
import { getErrorMarks } from './get_error_marks';

describe('getErrorMarks', () => {
  const emptyErrorLinksMap = new Map<string, string>();

  describe('returns empty array', () => {
    it('when items are missing', () => {
      expect(getErrorMarks([], emptyErrorLinksMap)).toEqual([]);
    });
  });

  it('returns error marks', () => {
    const items = [
      {
        docType: 'error',
        offset: 10,
        skew: 5,
        id: '1',
        doc: { error: { id: '1' }, service: { name: 'opbeans-java' } },
        color: 'red',
      } as unknown,
      {
        docType: 'error',
        offset: 50,
        skew: 0,
        id: '2',
        doc: { error: { id: '2' }, service: { name: 'opbeans-node' } },
        color: 'blue',
      } as unknown,
    ] as IWaterfallError[];
    expect(getErrorMarks(items, emptyErrorLinksMap)).toEqual([
      {
        type: 'errorMark',
        offset: 15,
        verticalLine: false,
        id: '1',
        error: { error: { id: '1' }, service: { name: 'opbeans-java' } },
        serviceColor: 'red',
        href: undefined,
      },
      {
        type: 'errorMark',
        offset: 50,
        verticalLine: false,
        id: '2',
        error: { error: { id: '2' }, service: { name: 'opbeans-node' } },
        serviceColor: 'blue',
        href: undefined,
      },
    ]);
  });

  it('returns error marks without service color', () => {
    const items = [
      {
        docType: 'error',
        offset: 10,
        skew: 5,
        id: '1',
        doc: { error: { id: '1' }, service: { name: 'opbeans-java' } },
        color: '',
      } as unknown,
      {
        docType: 'error',
        offset: 50,
        skew: 0,
        id: '2',
        doc: { error: { id: '2' }, service: { name: 'opbeans-node' } },
        color: '',
      } as unknown,
    ] as IWaterfallError[];
    expect(getErrorMarks(items, emptyErrorLinksMap)).toEqual([
      {
        type: 'errorMark',
        offset: 15,
        verticalLine: false,
        id: '1',
        error: { error: { id: '1' }, service: { name: 'opbeans-java' } },
        serviceColor: '',
        href: undefined,
      },
      {
        type: 'errorMark',
        offset: 50,
        verticalLine: false,
        id: '2',
        error: { error: { id: '2' }, service: { name: 'opbeans-node' } },
        serviceColor: '',
        href: undefined,
      },
    ]);
  });

  describe('errorLinksMap', () => {
    it('returns error marks with href when errorLinksMap has matching entries', () => {
      const items = [
        {
          docType: 'error',
          offset: 10,
          skew: 5,
          id: 'error-1',
          doc: { error: { id: 'error-1' }, service: { name: 'opbeans-java' } },
          color: 'red',
        } as unknown,
        {
          docType: 'error',
          offset: 50,
          skew: 0,
          id: 'error-2',
          doc: { error: { id: 'error-2' }, service: { name: 'opbeans-node' } },
          color: 'blue',
        } as unknown,
      ] as IWaterfallError[];

      const errorLinksMap = new Map<string, string>([
        ['error-1', '/app/apm/services/opbeans-java/errors/error-1'],
        ['error-2', '/app/apm/services/opbeans-node/errors/error-2'],
      ]);

      expect(getErrorMarks(items, errorLinksMap)).toEqual([
        {
          type: 'errorMark',
          offset: 15,
          verticalLine: false,
          id: 'error-1',
          error: { error: { id: 'error-1' }, service: { name: 'opbeans-java' } },
          serviceColor: 'red',
          href: '/app/apm/services/opbeans-java/errors/error-1',
        },
        {
          type: 'errorMark',
          offset: 50,
          verticalLine: false,
          id: 'error-2',
          error: { error: { id: 'error-2' }, service: { name: 'opbeans-node' } },
          serviceColor: 'blue',
          href: '/app/apm/services/opbeans-node/errors/error-2',
        },
      ]);
    });

    it('returns undefined href for errors not in errorLinksMap', () => {
      const items = [
        {
          docType: 'error',
          offset: 10,
          skew: 5,
          id: 'error-1',
          doc: { error: { id: 'error-1' }, service: { name: 'opbeans-java' } },
          color: 'red',
        } as unknown,
      ] as IWaterfallError[];

      const errorLinksMap = new Map<string, string>([
        ['other-error', '/app/apm/services/other/errors/other-error'],
      ]);

      expect(getErrorMarks(items, errorLinksMap)).toEqual([
        {
          type: 'errorMark',
          offset: 15,
          verticalLine: false,
          id: 'error-1',
          error: { error: { id: 'error-1' }, service: { name: 'opbeans-java' } },
          serviceColor: 'red',
          href: undefined,
        },
      ]);
    });
  });

  describe('offset calculation', () => {
    it('calculates offset as sum of offset and skew', () => {
      const items = [
        {
          docType: 'error',
          offset: 100,
          skew: 50,
          id: 'error-1',
          doc: { error: { id: 'error-1' }, service: { name: 'opbeans-java' } },
          color: 'red',
        } as unknown,
      ] as IWaterfallError[];

      const result = getErrorMarks(items, emptyErrorLinksMap);
      expect(result[0].offset).toBe(150);
    });

    it('returns 0 when offset + skew is negative', () => {
      const items = [
        {
          docType: 'error',
          offset: -100,
          skew: 50,
          id: 'error-1',
          doc: { error: { id: 'error-1' }, service: { name: 'opbeans-java' } },
          color: 'red',
        } as unknown,
      ] as IWaterfallError[];

      const result = getErrorMarks(items, emptyErrorLinksMap);
      expect(result[0].offset).toBe(0);
    });

    it('returns 0 when offset is 0 and skew is negative', () => {
      const items = [
        {
          docType: 'error',
          offset: 0,
          skew: -10,
          id: 'error-1',
          doc: { error: { id: 'error-1' }, service: { name: 'opbeans-java' } },
          color: 'red',
        } as unknown,
      ] as IWaterfallError[];

      const result = getErrorMarks(items, emptyErrorLinksMap);
      expect(result[0].offset).toBe(0);
    });
  });
});
