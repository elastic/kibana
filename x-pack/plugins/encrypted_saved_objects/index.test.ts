/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { encryptedSavedObjects } from './index';
import { getConfigSchema } from '../../test_utils';

describe('config', () => {
  it('uses a default encryption key when running from source', async () => {
    const schema = await getConfigSchema(encryptedSavedObjects);
    await expect(
      schema.validate(
        {},
        {
          context: {
            dist: false,
          },
        }
      )
    ).resolves.toMatchInlineSnapshot(`
Object {
  "enabled": true,
  "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
}
`);
  });

  it('uses no default encryption key when running from dist', async () => {
    const schema = await getConfigSchema(encryptedSavedObjects);
    await expect(
      schema.validate(
        {},
        {
          context: {
            dist: true,
          },
        }
      )
    ).resolves.toMatchInlineSnapshot(`
Object {
  "enabled": true,
}
`);
  });
});
