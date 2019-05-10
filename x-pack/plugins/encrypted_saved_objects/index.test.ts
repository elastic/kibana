/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { encryptedSavedObjects } from './index';
import Joi from 'joi';

function getConfigSchema(): Joi.Schema {
  class Plugin {
    constructor(public readonly options: any) {}
  }
  const plugin = encryptedSavedObjects({ Plugin });
  return plugin.options.config(Joi);
}

describe('config', () => {
  it('uses a default encryption key when running from source', () => {
    const schema = getConfigSchema();
    expect(
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

  it('uses no default encryption key when running from dist', () => {
    const schema = getConfigSchema();
    expect(
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
