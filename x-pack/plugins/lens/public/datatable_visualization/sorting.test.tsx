/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSortingCriteria } from './sorting';
import { FieldFormat } from 'src/plugins/data/public';
import { DatatableColumnType } from 'src/plugins/expressions';

function getMockFormatter() {
  return { convert: (v: unknown) => `${v as string}` } as FieldFormat;
}

function testSorting({
  input,
  output,
  direction,
  type,
  keepLast,
}: {
  input: unknown[];
  output: unknown[];
  direction: 'asc' | 'desc';
  type: DatatableColumnType | 'range';
  keepLast?: boolean; // special flag to handle values that should always be last no matter the direction
}) {
  const datatable = input.map((v) => ({
    a: v,
  }));
  const sorted = output.map((v) => ({ a: v }));
  if (direction === 'desc') {
    sorted.reverse();
    if (keepLast) {
      // Cycle shift of the first element
      const firstEl = sorted.shift()!;
      sorted.push(firstEl);
    }
  }
  const criteria = getSortingCriteria(type, 'a', getMockFormatter(), direction);
  expect(datatable.sort(criteria)).toEqual(sorted);
}

describe('Data sorting criteria', () => {
  describe('Numeric values', () => {
    for (const direction of ['asc', 'desc'] as const) {
      it(`should provide the number criteria of numeric values (${direction})`, () => {
        testSorting({
          input: [7, 6, 5, -Infinity, Infinity],
          output: [-Infinity, 5, 6, 7, Infinity],
          direction,
          type: 'number',
        });
      });

      it(`should provide the number criteria for date values (${direction})`, () => {
        const now = Date.now();
        testSorting({
          input: [now, 0, now - 150000],
          output: [0, now - 150000, now],
          direction,
          type: 'date',
        });
      });
    }
  });

  describe('String or anything else as string', () => {
    for (const direction of ['asc', 'desc'] as const) {
      it(`should provide the string criteria for terms values (${direction})`, () => {
        testSorting({
          input: ['a', 'b', 'c', 'd', '12'],
          output: ['12', 'a', 'b', 'c', 'd'],
          direction,
          type: 'string',
        });
      });

      it(`should provide the string criteria for other types of values (${direction})`, () => {
        testSorting({
          input: [true, false, false],
          output: [false, false, true],
          direction,
          type: 'boolean',
        });
      });
    }
  });

  describe('IP sorting', () => {
    for (const direction of ['asc', 'desc'] as const) {
      it(`should provide the IP criteria for IP values (IPv4 only values) - ${direction}`, () => {
        testSorting({
          input: ['127.0.0.1', '192.168.1.50', '200.100.100.10', '10.0.1.76', '8.8.8.8'],
          output: ['8.8.8.8', '10.0.1.76', '127.0.0.1', '192.168.1.50', '200.100.100.10'],
          direction,
          type: 'ip',
        });
      });

      it(`should provide the IP criteria for IP values (IPv6 only values) - ${direction}`, () => {
        testSorting({
          input: [
            'fc00::123',
            '::1',
            '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
            '2001:db8:1234:0000:0000:0000:0000:0000',
            '2001:db8:1234::', // equivalent to the above
          ],
          output: [
            '::1',
            '2001:db8:1234::',
            '2001:db8:1234:0000:0000:0000:0000:0000',
            '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
            'fc00::123',
          ],
          direction,
          type: 'ip',
        });
      });

      it(`should provide the IP criteria for IP values (mixed values) - ${direction}`, () => {
        // A mix of IPv4, IPv6, IPv4 mapped to IPv6
        testSorting({
          input: [
            'fc00::123',
            '192.168.1.50',
            '::FFFF:192.168.1.50', // equivalent to the above with the IPv6 mapping
            '10.0.1.76',
            '8.8.8.8',
            '::1',
          ],
          output: [
            '::1',
            '8.8.8.8',
            '10.0.1.76',
            '192.168.1.50',
            '::FFFF:192.168.1.50',
            'fc00::123',
          ],
          direction,
          type: 'ip',
        });
      });

      it(`should provide the IP criteria for IP values (mixed values with invalid "Other" field) - ${direction}`, () => {
        testSorting({
          input: ['fc00::123', '192.168.1.50', 'Other', '10.0.1.76', '8.8.8.8', '::1'],
          output: ['::1', '8.8.8.8', '10.0.1.76', '192.168.1.50', 'fc00::123', 'Other'],
          direction,
          type: 'ip',
          keepLast: true,
        });
      });
    }
  });

  describe('Range sorting', () => {
    for (const direction of ['asc', 'desc'] as const) {
      it(`should sort closed ranges - ${direction}`, () => {
        testSorting({
          input: [
            { gte: 1, lt: 5 },
            { gte: 0, lt: 5 },
            { gte: 0, lt: 1 },
          ],
          output: [
            { gte: 0, lt: 1 },
            { gte: 0, lt: 5 },
            { gte: 1, lt: 5 },
          ],
          direction,
          type: 'range',
        });
      });

      it(`should sort open ranges - ${direction}`, () => {
        testSorting({
          input: [{ gte: 1, lt: 5 }, { gte: 0, lt: 5 }, { gte: 0 }],
          output: [{ gte: 0, lt: 5 }, { gte: 0 }, { gte: 1, lt: 5 }],
          direction,
          type: 'range',
        });
      });
    }
  });
});
