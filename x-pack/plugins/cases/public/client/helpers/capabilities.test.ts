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
        "connectors": false,
        "create": false,
        "delete": false,
        "push": false,
        "read": false,
        "settings": false,
        "update": false,
      }
    `);
  });

  it('returns false for all fields when the capabilities are not passed in', () => {
    expect(getUICapabilities()).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "connectors": false,
        "create": false,
        "delete": false,
        "push": false,
        "read": false,
        "settings": false,
        "update": false,
      }
    `);
  });

  it('returns true for create when it is set to true in the ui capabilities', () => {
    expect(getUICapabilities({ create_cases: true })).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "connectors": false,
        "create": true,
        "delete": false,
        "push": false,
        "read": false,
        "settings": false,
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
        cases_connectors: false,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "connectors": false,
        "create": false,
        "delete": false,
        "push": false,
        "read": false,
        "settings": false,
        "update": false,
      }
    `);
  });

  it('returns false for all fields when the ui capabilities is an empty object', () => {
    expect(getUICapabilities({})).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "connectors": false,
        "create": false,
        "delete": false,
        "push": false,
        "read": false,
        "settings": false,
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
        cases_connectors: true,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "connectors": true,
        "create": false,
        "delete": true,
        "push": true,
        "read": true,
        "settings": false,
        "update": true,
      }
    `);
  });

  it('returns false for the all field when cases_connectors is false', () => {
    expect(
      getUICapabilities({
        create_cases: true,
        read_cases: true,
        update_cases: true,
        delete_cases: true,
        push_cases: true,
        cases_connectors: false,
        cases_settings: true,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "connectors": false,
        "create": true,
        "delete": true,
        "push": true,
        "read": true,
        "settings": true,
        "update": true,
      }
    `);
  });

  it('returns false for the all field when cases_settings is false', () => {
    expect(
      getUICapabilities({
        create_cases: true,
        read_cases: true,
        update_cases: true,
        delete_cases: true,
        push_cases: true,
        cases_connectors: true,
        cases_settings: false,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "connectors": true,
        "create": true,
        "delete": true,
        "push": true,
        "read": true,
        "settings": false,
        "update": true,
      }
    `);
  });

  it('returns true for cases_settings when it is set to true in the ui capabilities', () => {
    expect(getUICapabilities({ cases_settings: true })).toMatchInlineSnapshot(`
      Object {
        "all": false,
        "connectors": false,
        "create": false,
        "delete": false,
        "push": false,
        "read": false,
        "settings": true,
        "update": false,
      }
    `);
  });
});
