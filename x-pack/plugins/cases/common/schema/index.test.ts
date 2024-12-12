/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';

import {
  limitedArraySchema,
  limitedNumberSchema,
  limitedStringSchema,
  mimeTypeString,
  NonEmptyString,
  paginationSchema,
  limitedNumberAsIntegerSchema,
} from '.';
import { MAX_DOCS_PER_PAGE } from '../constants';

describe('schema', () => {
  describe('limitedArraySchema', () => {
    const fieldName = 'foobar';

    it('fails when given an empty string', () => {
      expect(
        PathReporter.report(
          limitedArraySchema({ codec: NonEmptyString, fieldName, min: 1, max: 1 }).decode([''])
        )
      ).toMatchInlineSnapshot(`
              Array [
                "string must have length >= 1",
              ]
          `);
    });

    it('fails when given an empty array', () => {
      expect(
        PathReporter.report(
          limitedArraySchema({ codec: NonEmptyString, fieldName, min: 1, max: 1 }).decode([])
        )
      ).toMatchInlineSnapshot(`
              Array [
                "The length of the field foobar is too short. Array must be of length >= 1.",
              ]
          `);
    });

    it('fails when given an array larger than the limit of one item', () => {
      expect(
        PathReporter.report(
          limitedArraySchema({ codec: NonEmptyString, fieldName, min: 1, max: 1 }).decode([
            'a',
            'b',
          ])
        )
      ).toMatchInlineSnapshot(`
              Array [
                "The length of the field foobar is too long. Array must be of length <= 1.",
              ]
          `);
    });

    it('succeeds when given an array of 1 item with a non-empty string', () => {
      expect(
        PathReporter.report(
          limitedArraySchema({ codec: NonEmptyString, fieldName, min: 1, max: 1 }).decode(['a'])
        )
      ).toMatchInlineSnapshot(`
              Array [
                "No errors!",
              ]
          `);
    });

    it('succeeds when given an array of 0 item with a non-empty string when the min is 0', () => {
      expect(
        PathReporter.report(
          limitedArraySchema({ codec: NonEmptyString, fieldName, min: 0, max: 2 }).decode([])
        )
      ).toMatchInlineSnapshot(`
              Array [
                "No errors!",
              ]
          `);
    });
  });

  describe('limitedStringSchema', () => {
    const fieldName = 'foo';

    it('fails when given string is shorter than minimum', () => {
      expect(PathReporter.report(limitedStringSchema({ fieldName, min: 2, max: 1 }).decode('a')))
        .toMatchInlineSnapshot(`
        Array [
          "The length of the foo is too short. The minimum length is 2.",
        ]
      `);
    });

    it('fails when given string is empty and minimum is not 0', () => {
      expect(PathReporter.report(limitedStringSchema({ fieldName, min: 1, max: 1 }).decode('')))
        .toMatchInlineSnapshot(`
        Array [
          "The foo field cannot be an empty string.",
        ]
      `);
    });

    it('fails when given string consists only empty characters and minimum is not 0', () => {
      expect(PathReporter.report(limitedStringSchema({ fieldName, min: 1, max: 1 }).decode('  ')))
        .toMatchInlineSnapshot(`
        Array [
          "The foo field cannot be an empty string.",
        ]
      `);
    });

    it('fails when given string is larger than maximum', () => {
      expect(
        PathReporter.report(
          limitedStringSchema({ fieldName, min: 1, max: 5 }).decode('Hello there!!')
        )
      ).toMatchInlineSnapshot(`
        Array [
          "The length of the foo is too long. The maximum length is 5.",
        ]
      `);
    });

    it('succeeds when given string within limit', () => {
      expect(
        PathReporter.report(limitedStringSchema({ fieldName, min: 1, max: 50 }).decode('Hello!!'))
      ).toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });

    it('succeeds when given string is empty and minimum is 0', () => {
      expect(PathReporter.report(limitedStringSchema({ fieldName, min: 0, max: 5 }).decode('')))
        .toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });

    it('succeeds when given string consists only empty characters and minimum is 0', () => {
      expect(PathReporter.report(limitedStringSchema({ fieldName, min: 0, max: 5 }).decode('  ')))
        .toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });

    it('succeeds when given string is same as maximum', () => {
      expect(
        PathReporter.report(limitedStringSchema({ fieldName, min: 0, max: 5 }).decode('Hello'))
      ).toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });

    it('succeeds when given string is larger than maximum but same as maximum after trim', () => {
      expect(
        PathReporter.report(limitedStringSchema({ fieldName, min: 0, max: 5 }).decode('Hello  '))
      ).toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });
  });

  describe('paginationSchema', () => {
    it('succeeds when no page or perPage passed', () => {
      expect(PathReporter.report(paginationSchema({ maxPerPage: 1 }).decode({})))
        .toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });

    it('succeeds when only valid page is passed', () => {
      expect(PathReporter.report(paginationSchema({ maxPerPage: 2 }).decode({ page: 0 })))
        .toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });

    it('succeeds when only valid perPage is passed', () => {
      expect(PathReporter.report(paginationSchema({ maxPerPage: 3 }).decode({ perPage: 1 })))
        .toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });

    it('succeeds when page and perPage are passed and valid', () => {
      expect(
        PathReporter.report(paginationSchema({ maxPerPage: 3 }).decode({ page: 1, perPage: 2 }))
      ).toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });

    it('fails when perPage > maxPerPage', () => {
      expect(PathReporter.report(paginationSchema({ maxPerPage: 3 }).decode({ perPage: 4 })))
        .toMatchInlineSnapshot(`
        Array [
          "The provided perPage value is too high. The maximum allowed perPage value is 3.",
        ]
      `);
    });

    it(`fails when page > ${MAX_DOCS_PER_PAGE}`, () => {
      expect(
        PathReporter.report(
          paginationSchema({ maxPerPage: 3 }).decode({ page: MAX_DOCS_PER_PAGE + 1 })
        )
      ).toMatchInlineSnapshot(`
        Array [
          "The number of documents is too high. Paginating through more than 10000 documents is not possible.",
        ]
      `);
    });

    it(`fails when page * perPage > ${MAX_DOCS_PER_PAGE}`, () => {
      expect(
        PathReporter.report(
          paginationSchema({ maxPerPage: 3 }).decode({ page: MAX_DOCS_PER_PAGE, perPage: 2 })
        )
      ).toMatchInlineSnapshot(`
        Array [
          "The number of documents is too high. Paginating through more than 10000 documents is not possible.",
        ]
      `);
    });

    it('validate params as strings work correctly', () => {
      expect(
        PathReporter.report(paginationSchema({ maxPerPage: 3 }).decode({ page: '1', perPage: '2' }))
      ).toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });

    it('invalid NumberFromString work correctly', () => {
      expect(
        PathReporter.report(paginationSchema({ maxPerPage: 3 }).decode({ page: 'a', perPage: 'b' }))
      ).toMatchInlineSnapshot(`
        Array [
          "Invalid value \\"a\\" supplied to : Pagination/page: (number | NumberFromString)/0: number",
          "cannot parse to a number",
          "Invalid value \\"b\\" supplied to : Pagination/perPage: (number | NumberFromString)/0: number",
          "cannot parse to a number",
        ]
      `);
    });

    it.skip('fails when page number is negative', () => {
      expect(PathReporter.report(paginationSchema({ maxPerPage: 3 }).decode({ page: -1 })))
        .toMatchInlineSnapshot(`
              Array [
                "The provided page value is too low. The minimum allowed page value is 0.",
              ]
          `);
    });

    it.skip('fails when perPage number is negative', () => {
      expect(PathReporter.report(paginationSchema({ maxPerPage: 3 }).decode({ perPage: -1 })))
        .toMatchInlineSnapshot(`
              Array [
                "The provided perPage value is too low. The minimum allowed perPage value is 0.",
              ]
          `);
    });
  });

  describe('limitedNumberSchema', () => {
    it('works correctly the number is between min and max', () => {
      expect(
        PathReporter.report(limitedNumberSchema({ fieldName: 'foo', min: 0, max: 2 }).decode(1))
      ).toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });

    it('fails when given a number that is lower than the minimum', () => {
      expect(
        PathReporter.report(limitedNumberSchema({ fieldName: 'foo', min: 1, max: 2 }).decode(0))
      ).toMatchInlineSnapshot(`
        Array [
          "The foo field cannot be less than 1.",
        ]
      `);
    });

    it('fails when given number that is higher than the maximum', () => {
      expect(
        PathReporter.report(limitedNumberSchema({ fieldName: 'foo', min: 1, max: 2 }).decode(3))
      ).toMatchInlineSnapshot(`
        Array [
          "The foo field cannot be more than 2.",
        ]
      `);
    });
  });

  describe('mimeTypeString', () => {
    it('works correctly when the value is an allowed mime type', () => {
      expect(PathReporter.report(mimeTypeString.decode('image/jpx'))).toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });

    it('fails when the value is not an allowed mime type', () => {
      expect(PathReporter.report(mimeTypeString.decode('foo/bar'))).toMatchInlineSnapshot(`
        Array [
          "The mime type field value foo/bar is not allowed.",
        ]
      `);
    });
  });

  describe('limitedNumberAsIntegerSchema', () => {
    it('works correctly the number is safe integer', () => {
      expect(PathReporter.report(limitedNumberAsIntegerSchema({ fieldName: 'foo' }).decode(1)))
        .toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });

    it('fails when given a number that is lower than the minimum', () => {
      expect(
        PathReporter.report(
          limitedNumberAsIntegerSchema({ fieldName: 'foo' }).decode(Number.MIN_SAFE_INTEGER - 1)
        )
      ).toMatchInlineSnapshot(`
        Array [
          "The foo field should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.",
        ]
      `);
    });

    it('fails when given a number that is higher than the maximum', () => {
      expect(
        PathReporter.report(
          limitedNumberAsIntegerSchema({ fieldName: 'foo' }).decode(Number.MAX_SAFE_INTEGER + 1)
        )
      ).toMatchInlineSnapshot(`
        Array [
          "The foo field should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.",
        ]
      `);
    });

    it('fails when given a null instead of a number', () => {
      expect(PathReporter.report(limitedNumberAsIntegerSchema({ fieldName: 'foo' }).decode(null)))
        .toMatchInlineSnapshot(`
          Array [
            "Invalid value null supplied to : LimitedNumberAsInteger",
          ]
        `);
    });

    it('fails when given a string instead of a number', () => {
      expect(
        PathReporter.report(
          limitedNumberAsIntegerSchema({ fieldName: 'foo' }).decode('some string')
        )
      ).toMatchInlineSnapshot(`
          Array [
            "Invalid value \\"some string\\" supplied to : LimitedNumberAsInteger",
          ]
        `);
    });

    it('fails when given a float number instead of an safe integer number', () => {
      expect(PathReporter.report(limitedNumberAsIntegerSchema({ fieldName: 'foo' }).decode(1.2)))
        .toMatchInlineSnapshot(`
          Array [
            "The foo field should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.",
          ]
        `);
    });
  });
});
