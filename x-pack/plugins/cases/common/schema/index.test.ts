/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';

import { limitedArraySchema, limitedStringSchema, NonEmptyString } from '.';

describe('schema', () => {
  it('fails when given an empty string', () => {
    expect(PathReporter.report(limitedArraySchema(NonEmptyString, 1, 1).decode([''])))
      .toMatchInlineSnapshot(`
      Array [
        "string must have length >= 1",
      ]
    `);
  });

  it('fails when given an empty array', () => {
    expect(PathReporter.report(limitedArraySchema(NonEmptyString, 1, 1).decode([])))
      .toMatchInlineSnapshot(`
      Array [
        "array must be of length >= 1",
      ]
    `);
  });

  it('fails when given an array larger than the limit of one item', () => {
    expect(PathReporter.report(limitedArraySchema(NonEmptyString, 1, 1).decode(['a', 'b'])))
      .toMatchInlineSnapshot(`
      Array [
        "array must be of length <= 1",
      ]
    `);
  });

  it('succeeds when given an array of 1 item with a non-empty string', () => {
    expect(PathReporter.report(limitedArraySchema(NonEmptyString, 1, 1).decode(['a'])))
      .toMatchInlineSnapshot(`
      Array [
        "No errors!",
      ]
    `);
  });

  it('succeeds when given an array of 0 item with a non-empty string when the min is 0', () => {
    expect(PathReporter.report(limitedArraySchema(NonEmptyString, 0, 2).decode([])))
      .toMatchInlineSnapshot(`
      Array [
        "No errors!",
      ]
    `);
  });

  describe('limitedStringSchema', () => {
    const fieldName = 'foo';

    it('fails when given string is shorter than minimum', () => {
      expect(PathReporter.report(limitedStringSchema(fieldName, 1, 1).decode('')))
        .toMatchInlineSnapshot(`
        Array [
          "The length of the ${fieldName} is too short. The minimum length is 1.",
        ]
      `);
    });

    it('fails when given string is larger than maximum', () => {
      expect(PathReporter.report(limitedStringSchema(fieldName, 1, 5).decode('Hello there!!')))
        .toMatchInlineSnapshot(`
        Array [
          "The length of the ${fieldName} is too long. The maximum length is 5.",
        ]
      `);
    });

    it('succeeds when given string within limit', () => {
      expect(PathReporter.report(limitedStringSchema(fieldName, 1, 5).decode('Hello')))
        .toMatchInlineSnapshot(`
        Array [
          "No errors!",
        ]
      `);
    });
  });
});
