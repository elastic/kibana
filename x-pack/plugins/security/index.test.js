/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { security } from './index';
import { getConfigSchema } from '../../test_utils';

const describeWithContext = describe.each([[{ dist: false }], [{ dist: true }]]);

describeWithContext('config schema with context %j', context => {
  it('produces correct config', async () => {
    const schema = await getConfigSchema(security);
    await expect(schema.validate({}, { context })).resolves.toMatchSnapshot();
  });
});

describe('config schema', () => {
  describe('authc', () => {
    describe('oidc', () => {
      describe('realm', () => {
        it(`returns a validation error when authProviders is "['oidc']" and realm is unspecified`, async () => {
          const schema = await getConfigSchema(security);
          const validationResult = schema.validate({
            authProviders: ['oidc'],
          });
          expect(validationResult.error).toMatchSnapshot();
        });

        it(`is valid when authProviders is "['oidc']" and realm is specified`, async () => {
          const schema = await getConfigSchema(security);
          const validationResult = schema.validate({
            authProviders: ['oidc'],
            authc: {
              oidc: {
                realm: 'realm-1',
              },
            },
          });
          expect(validationResult.error).toBeNull();
          expect(validationResult.value).toHaveProperty('authc.oidc.realm', 'realm-1');
        });

        it(`returns a validation error when authProviders is "['oidc', 'basic']" and realm is unspecified`, async () => {
          const schema = await getConfigSchema(security);
          const validationResult = schema.validate({
            authProviders: ['oidc', 'basic'],
          });
          expect(validationResult.error).toMatchSnapshot();
        });

        it(`is valid when authProviders is "['oidc', 'basic']" and realm is specified`, async () => {
          const schema = await getConfigSchema(security);
          const validationResult = schema.validate({
            authProviders: ['oidc', 'basic'],
            authc: {
              oidc: {
                realm: 'realm-1',
              },
            },
          });
          expect(validationResult.error).toBeNull();
          expect(validationResult.value).toHaveProperty('authc.oidc.realm', 'realm-1');
        });

        it(`realm is not allowed when authProviders is "['basic']"`, async () => {
          const schema = await getConfigSchema(security);
          const validationResult = schema.validate({
            authProviders: ['basic'],
            authc: {
              oidc: {
                realm: 'realm-1',
              },
            },
          });
          expect(validationResult.error).toMatchSnapshot();
        });
      });
    });
  });
});
