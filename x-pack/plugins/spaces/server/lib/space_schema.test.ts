/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spaceSchema } from './space_schema';

const defaultProperties = {
  id: 'foo',
  name: 'foo',
};

describe('#id', () => {
  test('is optional', () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      id: undefined,
    });
    expect(result.error).toBeNull();
  });

  test('allows lowercase a-z, 0-9, "_" and "-"', () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      id: 'abcdefghijklmnopqrstuvwxyz0123456789_-',
    });
    expect(result.error).toBeNull();
  });

  test(`doesn't allow uppercase`, () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      id: 'Foo',
    });
    expect(result.error).toMatchInlineSnapshot(
      `[ValidationError: child "id" fails because ["id" with value "Foo" fails to match the lower case, a-z, 0-9, "_", and "-" are allowed pattern]]`
    );
  });

  test(`doesn't allow an empty string`, () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      id: '',
    });
    expect(result.error).toMatchInlineSnapshot(
      `[ValidationError: child "id" fails because ["id" is not allowed to be empty]]`
    );
  });

  ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '+', ',', '.', '/', '?'].forEach(
    invalidCharacter => {
      test(`doesn't allow ${invalidCharacter}`, () => {
        const result = spaceSchema.validate({
          ...defaultProperties,
          id: `foo-${invalidCharacter}`,
        });
        expect(result.error).toMatchObject({
          message: `child "id" fails because ["id" with value "foo-${invalidCharacter}" fails to match the lower case, a-z, 0-9, "_", and "-" are allowed pattern]`,
        });
      });
    }
  );
});
