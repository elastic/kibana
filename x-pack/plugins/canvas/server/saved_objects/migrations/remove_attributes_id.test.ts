/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { removeAttributesId } from './remove_attributes_id';

const context: any = {
  log: jest.fn(),
};

describe(`removeAttributesId`, () => {
  it('does not throw error on empty object', () => {
    const migratedDoc = removeAttributesId({} as any, context);
    expect(migratedDoc).toMatchInlineSnapshot(`Object {}`);
  });

  it('removes id from "attributes"', () => {
    const migratedDoc = removeAttributesId(
      {
        foo: true,
        attributes: {
          id: '123',
          bar: true,
        },
      } as any,
      context
    );
    expect(migratedDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "bar": true,
  },
  "foo": true,
}
`);
  });
});
