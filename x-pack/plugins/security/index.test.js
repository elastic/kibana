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
        it(`returns a validation error when authc.providers is "['oidc']" and realm is unspecified`, async () => {
          const schema = await getConfigSchema(security);
          expect(schema.validate({ authc: { providers: ['oidc'] } }).error).toMatchSnapshot();
          expect(schema.validate({ authc: { providers: ['oidc'], oidc: {} } }).error).toMatchSnapshot();
        });

        it(`is valid when authc.providers is "['oidc']" and realm is specified`, async () => {
          const schema = await getConfigSchema(security);
          const validationResult = schema.validate({
            authc: {
              providers: ['oidc'],
              oidc: {
                realm: 'realm-1',
              },
            },
          });
          expect(validationResult.error).toBeNull();
          expect(validationResult.value).toHaveProperty('authc.oidc.realm', 'realm-1');
        });

        it(`returns a validation error when authc.providers is "['oidc', 'basic']" and realm is unspecified`, async () => {
          const schema = await getConfigSchema(security);
          const validationResult = schema.validate({
            authc: { providers: ['oidc', 'basic'] },
          });
          expect(validationResult.error).toMatchSnapshot();
        });

        it(`is valid when authc.providers is "['oidc', 'basic']" and realm is specified`, async () => {
          const schema = await getConfigSchema(security);
          const validationResult = schema.validate({
            authc: {
              providers: ['oidc', 'basic'],
              oidc: {
                realm: 'realm-1',
              },
            },
          });
          expect(validationResult.error).toBeNull();
          expect(validationResult.value).toHaveProperty('authc.oidc.realm', 'realm-1');
        });

        it(`realm is not allowed when authc.providers is "['basic']"`, async () => {
          const schema = await getConfigSchema(security);
          const validationResult = schema.validate({
            authc: {
              providers: ['basic'],
              oidc: {
                realm: 'realm-1',
              },
            },
          });
          expect(validationResult.error).toMatchSnapshot();
        });
      });
    });

    describe('saml', () => {
      it('fails if authc.providers includes `saml`, but `saml.realm` is not specified', async () => {
        const schema = await getConfigSchema(security);

        expect(schema.validate({ authc: { providers: ['saml'] } }).error).toMatchInlineSnapshot(
          `[ValidationError: child "authc" fails because [child "saml" fails because ["saml" is required]]]`
        );
        expect(
          schema.validate({ authc: { providers: ['saml'], saml: {} } }).error
        ).toMatchInlineSnapshot(
          `[ValidationError: child "authc" fails because [child "saml" fails because [child "realm" fails because ["realm" is required]]]]`
        );

        const validationResult = schema.validate({
          authc: { providers: ['saml'], saml: { realm: 'realm-1' } },
        });

        expect(validationResult.error).toBeNull();
        expect(validationResult.value.authc.saml.realm).toBe('realm-1');
      });

      it('`realm` is not allowed if saml provider is not enabled', async () => {
        const schema = await getConfigSchema(security);
        expect(
          schema.validate({
            authc: {
              providers: ['basic'],
              saml: { realm: 'realm-1' },
            },
          }).error
        ).toMatchInlineSnapshot(
          `[ValidationError: child "authc" fails because [child "saml" fails because ["saml" is not allowed]]]`
        );
      });
    });
  });
});
