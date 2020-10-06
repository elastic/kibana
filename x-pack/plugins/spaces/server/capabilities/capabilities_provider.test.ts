/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { capabilitiesProvider } from './capabilities_provider';

describe('Capabilities provider', () => {
  it('provides the expected capabilities', () => {
    expect(capabilitiesProvider()).toMatchInlineSnapshot(`
      Object {
        "catalogue": Object {
          "spaces": true,
        },
        "management": Object {
          "kibana": Object {
            "spaces": true,
          },
        },
        "spaces": Object {
          "manage": true,
        },
      }
    `);
  });
});
