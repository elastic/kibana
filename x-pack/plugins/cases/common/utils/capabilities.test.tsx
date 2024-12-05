/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUICapabilities } from './capabilities';

describe('createUICapabilities', () => {
  it('returns the UI capabilities correctly', () => {
    expect(createUICapabilities()).toMatchInlineSnapshot(`
      Object {
        "all": Array [
          "create_cases",
          "read_cases",
          "update_cases",
          "push_cases",
          "cases_connectors",
        ],
        "createComment": Array [
          "create_comment",
        ],
        "delete": Array [
          "delete_cases",
        ],
        "read": Array [
          "read_cases",
          "cases_connectors",
        ],
        "reopenCase": Array [
          "case_reopen",
        ],
        "settings": Array [
          "cases_settings",
        ],
      }
    `);
  });
});
