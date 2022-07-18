/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUICapabilities } from './capabilities';

describe('getUICapabilities', () => {
  it('returns false for all fields when the feature cannot be found', () => {
    expect(getUICapabilities(undefined)).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "create": false,
        "delete": false,
        "push": false,
        "read": false,
        "update": false,
      }
    `);
  });

  it('returns false for all fields when the capabilities are not passed in', () => {
    expect(getUICapabilities()).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "create": false,
        "delete": false,
        "push": false,
        "read": false,
        "update": false,
      }
    `);
  });

  it('returns true for create when it is set to true in the ui capabilities', () => {
    expect(getUICapabilities({ create_cases: true })).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "create": true,
        "delete": false,
        "push": false,
        "read": false,
        "update": false,
      }
    `);
  });

  it('returns false for all fields when the ui capabilities are false', () => {
    expect(
      getUICapabilities({
        create_cases: false,
        read_cases: false,
        update_cases: false,
        delete_cases: false,
        push_cases: false,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "create": false,
        "delete": false,
        "push": false,
        "read": false,
        "update": false,
      }
    `);
  });

  it('returns false for all fields when the ui capabilities is an empty object', () => {
    expect(getUICapabilities({})).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "create": false,
        "delete": false,
        "push": false,
        "read": false,
        "update": false,
      }
    `);
  });

  it('returns false for the all field when a single field is false', () => {
    expect(
      getUICapabilities({
        create_cases: false,
        read_cases: true,
        update_cases: true,
        delete_cases: true,
        push_cases: true,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "create": false,
        "delete": true,
        "push": true,
        "read": true,
        "update": true,
      }
    `);
  });
});
