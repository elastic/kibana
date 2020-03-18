/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('crypto', () => ({ randomBytes: jest.fn() }));

import { loggingServiceMock } from '../../../../src/core/server/mocks';
import { createConfig, ConfigSchema } from './config';

describe('config schema', () => {
  it('generates proper defaults', () => {
    expect(ConfigSchema.validate({})).toMatchInlineSnapshot(`
      Object {
        "audit": Object {
          "enabled": false,
        },
        "authc": Object {
          "http": Object {
            "autoSchemesEnabled": true,
            "enabled": true,
            "schemes": Array [
              "apikey",
            ],
          },
          "providers": Object {
            "basic": Object {
              "basic": Object {
                "description": undefined,
                "enabled": true,
                "order": 0,
                "showInSelector": true,
              },
            },
            "kerberos": undefined,
            "oidc": undefined,
            "pki": undefined,
            "saml": undefined,
            "token": undefined,
          },
          "selector": Object {},
        },
        "cookieName": "sid",
        "enabled": true,
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "loginAssistanceMessage": "",
        "secureCookies": false,
        "session": Object {
          "idleTimeout": null,
          "lifespan": null,
        },
      }
    `);

    expect(ConfigSchema.validate({}, { dist: false })).toMatchInlineSnapshot(`
      Object {
        "audit": Object {
          "enabled": false,
        },
        "authc": Object {
          "http": Object {
            "autoSchemesEnabled": true,
            "enabled": true,
            "schemes": Array [
              "apikey",
            ],
          },
          "providers": Object {
            "basic": Object {
              "basic": Object {
                "description": undefined,
                "enabled": true,
                "order": 0,
                "showInSelector": true,
              },
            },
            "kerberos": undefined,
            "oidc": undefined,
            "pki": undefined,
            "saml": undefined,
            "token": undefined,
          },
          "selector": Object {},
        },
        "cookieName": "sid",
        "enabled": true,
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "loginAssistanceMessage": "",
        "secureCookies": false,
        "session": Object {
          "idleTimeout": null,
          "lifespan": null,
        },
      }
    `);

    expect(ConfigSchema.validate({}, { dist: true })).toMatchInlineSnapshot(`
      Object {
        "audit": Object {
          "enabled": false,
        },
        "authc": Object {
          "http": Object {
            "autoSchemesEnabled": true,
            "enabled": true,
            "schemes": Array [
              "apikey",
            ],
          },
          "providers": Object {
            "basic": Object {
              "basic": Object {
                "description": undefined,
                "enabled": true,
                "order": 0,
                "showInSelector": true,
              },
            },
            "kerberos": undefined,
            "oidc": undefined,
            "pki": undefined,
            "saml": undefined,
            "token": undefined,
          },
          "selector": Object {},
        },
        "cookieName": "sid",
        "enabled": true,
        "loginAssistanceMessage": "",
        "secureCookies": false,
        "session": Object {
          "idleTimeout": null,
          "lifespan": null,
        },
      }
    `);
  });

  it('should throw error if xpack.security.encryptionKey is less than 32 characters', () => {
    expect(() =>
      ConfigSchema.validate({ encryptionKey: 'foo' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[encryptionKey]: value has length [3] but it must have a minimum length of [32]."`
    );

    expect(() =>
      ConfigSchema.validate({ encryptionKey: 'foo' }, { dist: true })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[encryptionKey]: value has length [3] but it must have a minimum length of [32]."`
    );
  });

  describe('authc.oidc', () => {
    it(`returns a validation error when authc.providers is "['oidc']" and realm is unspecified`, async () => {
      expect(() =>
        ConfigSchema.validate({ authc: { providers: ['oidc'] } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[authc.oidc.realm]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        ConfigSchema.validate({ authc: { providers: ['oidc'], oidc: {} } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[authc.oidc.realm]: expected value of type [string] but got [undefined]"`
      );
    });

    it(`is valid when authc.providers is "['oidc']" and realm is specified`, async () => {
      expect(
        ConfigSchema.validate({
          authc: { providers: ['oidc'], oidc: { realm: 'realm-1' } },
        }).authc
      ).toMatchInlineSnapshot(`
        Object {
          "http": Object {
            "autoSchemesEnabled": true,
            "enabled": true,
            "schemes": Array [
              "apikey",
            ],
          },
          "oidc": Object {
            "realm": "realm-1",
          },
          "providers": Array [
            "oidc",
          ],
          "selector": Object {},
        }
      `);
    });

    it(`returns a validation error when authc.providers is "['oidc', 'basic']" and realm is unspecified`, async () => {
      expect(() =>
        ConfigSchema.validate({ authc: { providers: ['oidc', 'basic'] } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[authc.oidc.realm]: expected value of type [string] but got [undefined]"`
      );
    });

    it(`is valid when authc.providers is "['oidc', 'basic']" and realm is specified`, async () => {
      expect(
        ConfigSchema.validate({
          authc: { providers: ['oidc', 'basic'], oidc: { realm: 'realm-1' } },
        }).authc
      ).toMatchInlineSnapshot(`
        Object {
          "http": Object {
            "autoSchemesEnabled": true,
            "enabled": true,
            "schemes": Array [
              "apikey",
            ],
          },
          "oidc": Object {
            "realm": "realm-1",
          },
          "providers": Array [
            "oidc",
            "basic",
          ],
          "selector": Object {},
        }
      `);
    });

    it(`realm is not allowed when authc.providers is "['basic']"`, async () => {
      expect(() =>
        ConfigSchema.validate({ authc: { providers: ['basic'], oidc: { realm: 'realm-1' } } })
      ).toThrowErrorMatchingInlineSnapshot(`"[authc.oidc]: a value wasn't expected to be present"`);
    });
  });

  describe('authc.saml', () => {
    it('fails if authc.providers includes `saml`, but `saml.realm` is not specified', async () => {
      expect(() =>
        ConfigSchema.validate({ authc: { providers: ['saml'] } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[authc.saml.realm]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        ConfigSchema.validate({ authc: { providers: ['saml'], saml: {} } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[authc.saml.realm]: expected value of type [string] but got [undefined]"`
      );

      expect(
        ConfigSchema.validate({
          authc: { providers: ['saml'], saml: { realm: 'realm-1' } },
        }).authc
      ).toMatchInlineSnapshot(`
        Object {
          "http": Object {
            "autoSchemesEnabled": true,
            "enabled": true,
            "schemes": Array [
              "apikey",
            ],
          },
          "providers": Array [
            "saml",
          ],
          "saml": Object {
            "maxRedirectURLSize": ByteSizeValue {
              "valueInBytes": 2048,
            },
            "realm": "realm-1",
          },
          "selector": Object {},
        }
      `);
    });

    it('`realm` is not allowed if saml provider is not enabled', async () => {
      expect(() =>
        ConfigSchema.validate({ authc: { providers: ['basic'], saml: { realm: 'realm-1' } } })
      ).toThrowErrorMatchingInlineSnapshot(`"[authc.saml]: a value wasn't expected to be present"`);
    });

    it('`maxRedirectURLSize` accepts any positive value that can coerce to `ByteSizeValue`', async () => {
      expect(
        ConfigSchema.validate({
          authc: { providers: ['saml'], saml: { realm: 'realm-1' } },
        }).authc.saml
      ).toMatchInlineSnapshot(`
                        Object {
                          "maxRedirectURLSize": ByteSizeValue {
                            "valueInBytes": 2048,
                          },
                          "realm": "realm-1",
                        }
                  `);

      expect(
        ConfigSchema.validate({
          authc: { providers: ['saml'], saml: { realm: 'realm-1', maxRedirectURLSize: 100 } },
        }).authc.saml
      ).toMatchInlineSnapshot(`
        Object {
          "maxRedirectURLSize": ByteSizeValue {
            "valueInBytes": 100,
          },
          "realm": "realm-1",
        }
      `);

      expect(
        ConfigSchema.validate({
          authc: { providers: ['saml'], saml: { realm: 'realm-1', maxRedirectURLSize: '1kb' } },
        }).authc.saml
      ).toMatchInlineSnapshot(`
                        Object {
                          "maxRedirectURLSize": ByteSizeValue {
                            "valueInBytes": 1024,
                          },
                          "realm": "realm-1",
                        }
                  `);

      expect(
        ConfigSchema.validate({
          authc: { providers: ['saml'], saml: { realm: 'realm-1', maxRedirectURLSize: '100b' } },
        }).authc.saml
      ).toMatchInlineSnapshot(`
        Object {
          "maxRedirectURLSize": ByteSizeValue {
            "valueInBytes": 100,
          },
          "realm": "realm-1",
        }
      `);

      expect(
        ConfigSchema.validate({
          authc: { providers: ['saml'], saml: { realm: 'realm-1', maxRedirectURLSize: 0 } },
        }).authc.saml
      ).toMatchInlineSnapshot(`
                Object {
                  "maxRedirectURLSize": ByteSizeValue {
                    "valueInBytes": 0,
                  },
                  "realm": "realm-1",
                }
            `);
    });
  });
});

describe('createConfig()', () => {
  it('should log a warning and set xpack.security.encryptionKey if not set', async () => {
    const mockRandomBytes = jest.requireMock('crypto').randomBytes;
    mockRandomBytes.mockReturnValue('ab'.repeat(16));

    const logger = loggingServiceMock.create().get();
    const config = createConfig(ConfigSchema.validate({}, { dist: true }), logger, {
      isTLSEnabled: true,
    });
    expect(config.encryptionKey).toEqual('ab'.repeat(16));

    expect(loggingServiceMock.collect(logger).warn).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "Generating a random key for xpack.security.encryptionKey. To prevent sessions from being invalidated on restart, please set xpack.security.encryptionKey in kibana.yml",
                          ],
                        ]
                `);
  });

  it('should log a warning if SSL is not configured', async () => {
    const logger = loggingServiceMock.create().get();
    const config = createConfig(ConfigSchema.validate({}), logger, { isTLSEnabled: false });
    expect(config.secureCookies).toEqual(false);

    expect(loggingServiceMock.collect(logger).warn).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "Session cookies will be transmitted over insecure connections. This is not recommended.",
                          ],
                        ]
                `);
  });

  it('should log a warning if SSL is not configured yet secure cookies are being used', async () => {
    const logger = loggingServiceMock.create().get();
    const config = createConfig(ConfigSchema.validate({ secureCookies: true }), logger, {
      isTLSEnabled: false,
    });
    expect(config.secureCookies).toEqual(true);

    expect(loggingServiceMock.collect(logger).warn).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "Using secure cookies, but SSL is not enabled inside Kibana. SSL must be configured outside of Kibana to function properly.",
                          ],
                        ]
                `);
  });

  it('should set xpack.security.secureCookies if SSL is configured', async () => {
    const logger = loggingServiceMock.create().get();
    const config = createConfig(ConfigSchema.validate({}), logger, { isTLSEnabled: true });
    expect(config.secureCookies).toEqual(true);

    expect(loggingServiceMock.collect(logger).warn).toEqual([]);
  });
});
