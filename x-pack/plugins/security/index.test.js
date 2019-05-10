/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { security } from './index';
import { getConfigSchema } from '../../test_utils';

describe('config', () => {
  it('produces correct config when running from source', async () => {
    const schema = await getConfigSchema(security);
    expect(
      schema.validate(
        {},
        {
          context: {
            dev: false,
            dist: false,
          },
        }
      )
    ).resolves.toMatchInlineSnapshot(`
Object {
  "audit": Object {
    "enabled": false,
  },
  "authProviders": Array [
    "basic",
  ],
  "authorization": Object {
    "legacyFallback": Object {
      "enabled": true,
    },
  },
  "cookieName": "sid",
  "enabled": true,
  "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "public": Object {},
  "secureCookies": false,
  "sessionTimeout": null,
}
`);
  });

  it('produces correct config when NOT running from source', async () => {
    const schema = await getConfigSchema(security);
    expect(
      schema.validate(
        {},
        {
          context: {
            dev: false,
            dist: true,
          },
        }
      )
    ).resolves.toMatchInlineSnapshot(`
Object {
  "audit": Object {
    "enabled": false,
  },
  "authProviders": Array [
    "basic",
  ],
  "authorization": Object {
    "legacyFallback": Object {
      "enabled": true,
    },
  },
  "cookieName": "sid",
  "enabled": true,
  "public": Object {},
  "secureCookies": false,
  "sessionTimeout": null,
}
`);
  });
});
