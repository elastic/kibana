/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('crypto', () => ({ randomBytes: jest.fn() }));

import { loggingSystemMock } from '../../../../src/core/server/mocks';
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
                "accessAgreement": undefined,
                "description": undefined,
                "enabled": true,
                "hint": undefined,
                "icon": undefined,
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
                "accessAgreement": undefined,
                "description": undefined,
                "enabled": true,
                "hint": undefined,
                "icon": undefined,
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
                "accessAgreement": undefined,
                "description": undefined,
                "enabled": true,
                "hint": undefined,
                "icon": undefined,
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

  describe('authc.providers (extended format)', () => {
    describe('`basic` provider', () => {
      it('requires `order`', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { basic: { basic1: { enabled: true } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.basic.basic1.order]: expected value of type [number] but got [undefined]"
`);
      });

      it('cannot be hidden from selector', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: {
              providers: { basic: { basic1: { order: 0, showInSelector: false } } },
            },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.basic.basic1.showInSelector]: \`basic\` provider only supports \`true\` in \`showInSelector\`."
`);
      });

      it('can have only provider of this type', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { basic: { basic1: { order: 0 }, basic2: { order: 1 } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.basic]: Only one \\"basic\\" provider can be configured."
`);
      });

      it('can be successfully validated', () => {
        expect(
          ConfigSchema.validate({
            authc: { providers: { basic: { basic1: { order: 0 } } } },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "basic": Object {
              "basic1": Object {
                "description": "Log in with Elasticsearch",
                "enabled": true,
                "icon": "logoElasticsearch",
                "order": 0,
                "showInSelector": true,
              },
            },
          }
        `);
      });
    });

    describe('`token` provider', () => {
      it('requires `order`', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { token: { token1: { enabled: true } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.token.token1.order]: expected value of type [number] but got [undefined]"
`);
      });

      it('cannot be hidden from selector', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: {
              providers: { token: { token1: { order: 0, showInSelector: false } } },
            },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.token.token1.showInSelector]: \`token\` provider only supports \`true\` in \`showInSelector\`."
`);
      });

      it('can have only provider of this type', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { token: { token1: { order: 0 }, token2: { order: 1 } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.token]: Only one \\"token\\" provider can be configured."
`);
      });

      it('can be successfully validated', () => {
        expect(
          ConfigSchema.validate({
            authc: { providers: { token: { token1: { order: 0 } } } },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "token": Object {
              "token1": Object {
                "description": "Log in with Elasticsearch",
                "enabled": true,
                "icon": "logoElasticsearch",
                "order": 0,
                "showInSelector": true,
              },
            },
          }
        `);
      });
    });

    describe('`pki` provider', () => {
      it('requires `order`', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { pki: { pki1: { enabled: true } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.pki.pki1.order]: expected value of type [number] but got [undefined]"
`);
      });

      it('can have only provider of this type', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { pki: { pki1: { order: 0 }, pki2: { order: 1 } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.pki]: Only one \\"pki\\" provider can be configured."
`);
      });

      it('can be successfully validated', () => {
        expect(
          ConfigSchema.validate({
            authc: { providers: { pki: { pki1: { order: 0 } } } },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "pki": Object {
              "pki1": Object {
                "enabled": true,
                "order": 0,
                "showInSelector": true,
              },
            },
          }
        `);
      });
    });

    describe('`kerberos` provider', () => {
      it('requires `order`', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { kerberos: { kerberos1: { enabled: true } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.kerberos.kerberos1.order]: expected value of type [number] but got [undefined]"
`);
      });

      it('can have only provider of this type', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: {
              providers: { kerberos: { kerberos1: { order: 0 }, kerberos2: { order: 1 } } },
            },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.kerberos]: Only one \\"kerberos\\" provider can be configured."
`);
      });

      it('can be successfully validated', () => {
        expect(
          ConfigSchema.validate({
            authc: { providers: { kerberos: { kerberos1: { order: 0 } } } },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "kerberos": Object {
              "kerberos1": Object {
                "enabled": true,
                "order": 0,
                "showInSelector": true,
              },
            },
          }
        `);
      });
    });

    describe('`oidc` provider', () => {
      it('requires `order`', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { oidc: { oidc1: { enabled: true } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.oidc.oidc1.order]: expected value of type [number] but got [undefined]"
`);
      });

      it('requires `realm`', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { oidc: { oidc1: { order: 0 } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.oidc.oidc1.realm]: expected value of type [string] but got [undefined]"
`);
      });

      it('can be successfully validated', () => {
        expect(
          ConfigSchema.validate({
            authc: {
              providers: {
                oidc: { oidc1: { order: 0, realm: 'oidc1' }, oidc2: { order: 1, realm: 'oidc2' } },
              },
            },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "oidc": Object {
              "oidc1": Object {
                "enabled": true,
                "order": 0,
                "realm": "oidc1",
                "showInSelector": true,
              },
              "oidc2": Object {
                "enabled": true,
                "order": 1,
                "realm": "oidc2",
                "showInSelector": true,
              },
            },
          }
        `);
      });
    });

    describe('`saml` provider', () => {
      it('requires `order`', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { saml: { saml1: { enabled: true } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.saml.saml1.order]: expected value of type [number] but got [undefined]"
`);
      });

      it('requires `realm`', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { saml: { saml1: { order: 0 } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1.saml.saml1.realm]: expected value of type [string] but got [undefined]"
`);
      });

      it('can be successfully validated', () => {
        expect(
          ConfigSchema.validate({
            authc: {
              providers: {
                saml: {
                  saml1: { order: 0, realm: 'saml1' },
                  saml2: { order: 1, realm: 'saml2', maxRedirectURLSize: '1kb' },
                  saml3: { order: 2, realm: 'saml3', useRelayStateDeepLink: true },
                },
              },
            },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "saml": Object {
              "saml1": Object {
                "enabled": true,
                "maxRedirectURLSize": ByteSizeValue {
                  "valueInBytes": 2048,
                },
                "order": 0,
                "realm": "saml1",
                "showInSelector": true,
                "useRelayStateDeepLink": false,
              },
              "saml2": Object {
                "enabled": true,
                "maxRedirectURLSize": ByteSizeValue {
                  "valueInBytes": 1024,
                },
                "order": 1,
                "realm": "saml2",
                "showInSelector": true,
                "useRelayStateDeepLink": false,
              },
              "saml3": Object {
                "enabled": true,
                "maxRedirectURLSize": ByteSizeValue {
                  "valueInBytes": 2048,
                },
                "order": 2,
                "realm": "saml3",
                "showInSelector": true,
                "useRelayStateDeepLink": true,
              },
            },
          }
        `);
      });
    });

    it('`name` should be unique across all provider types', () => {
      expect(() =>
        ConfigSchema.validate({
          authc: {
            providers: {
              basic: { provider1: { order: 0 } },
              saml: {
                provider2: { order: 1, realm: 'saml1' },
                provider1: { order: 2, realm: 'saml2' },
              },
            },
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1]: Found multiple providers configured with the same name \\"provider1\\": [xpack.security.authc.providers.basic.provider1, xpack.security.authc.providers.saml.provider1]"
`);
    });

    it('`order` should be unique across all provider types', () => {
      expect(() =>
        ConfigSchema.validate({
          authc: {
            providers: {
              basic: { provider1: { order: 0 } },
              saml: {
                provider2: { order: 0, realm: 'saml1' },
                provider3: { order: 2, realm: 'saml2' },
              },
            },
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(`
"[authc.providers]: types that failed validation:
- [authc.providers.0]: expected value of type [array] but got [Object]
- [authc.providers.1]: Found multiple providers configured with the same order \\"0\\": [xpack.security.authc.providers.basic.provider1, xpack.security.authc.providers.saml.provider2]"
`);
    });

    it('can be successfully validated with multiple providers ignoring uniqueness violations in disabled ones', () => {
      expect(
        ConfigSchema.validate({
          authc: {
            providers: {
              basic: { basic1: { order: 0 }, basic2: { enabled: false, order: 1 } },
              saml: {
                saml1: { order: 1, realm: 'saml1' },
                saml2: { order: 2, realm: 'saml2' },
                basic1: { order: 3, realm: 'saml3', enabled: false },
              },
            },
          },
        }).authc.providers
      ).toMatchInlineSnapshot(`
        Object {
          "basic": Object {
            "basic1": Object {
              "description": "Log in with Elasticsearch",
              "enabled": true,
              "icon": "logoElasticsearch",
              "order": 0,
              "showInSelector": true,
            },
            "basic2": Object {
              "description": "Log in with Elasticsearch",
              "enabled": false,
              "icon": "logoElasticsearch",
              "order": 1,
              "showInSelector": true,
            },
          },
          "saml": Object {
            "basic1": Object {
              "enabled": false,
              "maxRedirectURLSize": ByteSizeValue {
                "valueInBytes": 2048,
              },
              "order": 3,
              "realm": "saml3",
              "showInSelector": true,
              "useRelayStateDeepLink": false,
            },
            "saml1": Object {
              "enabled": true,
              "maxRedirectURLSize": ByteSizeValue {
                "valueInBytes": 2048,
              },
              "order": 1,
              "realm": "saml1",
              "showInSelector": true,
              "useRelayStateDeepLink": false,
            },
            "saml2": Object {
              "enabled": true,
              "maxRedirectURLSize": ByteSizeValue {
                "valueInBytes": 2048,
              },
              "order": 2,
              "realm": "saml2",
              "showInSelector": true,
              "useRelayStateDeepLink": false,
            },
          },
        }
      `);
    });
  });
});

describe('createConfig()', () => {
  it('should log a warning and set xpack.security.encryptionKey if not set', async () => {
    const mockRandomBytes = jest.requireMock('crypto').randomBytes;
    mockRandomBytes.mockReturnValue('ab'.repeat(16));

    const logger = loggingSystemMock.create().get();
    const config = createConfig(ConfigSchema.validate({}, { dist: true }), logger, {
      isTLSEnabled: true,
    });
    expect(config.encryptionKey).toEqual('ab'.repeat(16));

    expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "Generating a random key for xpack.security.encryptionKey. To prevent sessions from being invalidated on restart, please set xpack.security.encryptionKey in kibana.yml",
                          ],
                        ]
                `);
  });

  it('should log a warning if SSL is not configured', async () => {
    const logger = loggingSystemMock.create().get();
    const config = createConfig(ConfigSchema.validate({}), logger, { isTLSEnabled: false });
    expect(config.secureCookies).toEqual(false);

    expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "Session cookies will be transmitted over insecure connections. This is not recommended.",
                          ],
                        ]
                `);
  });

  it('should log a warning if SSL is not configured yet secure cookies are being used', async () => {
    const logger = loggingSystemMock.create().get();
    const config = createConfig(ConfigSchema.validate({ secureCookies: true }), logger, {
      isTLSEnabled: false,
    });
    expect(config.secureCookies).toEqual(true);

    expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "Using secure cookies, but SSL is not enabled inside Kibana. SSL must be configured outside of Kibana to function properly.",
                          ],
                        ]
                `);
  });

  it('should set xpack.security.secureCookies if SSL is configured', async () => {
    const logger = loggingSystemMock.create().get();
    const config = createConfig(ConfigSchema.validate({}), logger, { isTLSEnabled: true });
    expect(config.secureCookies).toEqual(true);

    expect(loggingSystemMock.collect(logger).warn).toEqual([]);
  });

  it('transforms legacy `authc.providers` into new format', () => {
    const logger = loggingSystemMock.create().get();

    expect(
      createConfig(
        ConfigSchema.validate({
          authc: {
            providers: ['saml', 'basic'],
            saml: { realm: 'saml-realm' },
          },
        }),
        logger,
        { isTLSEnabled: true }
      ).authc
    ).toMatchInlineSnapshot(`
      Object {
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
              "enabled": true,
              "order": 1,
              "showInSelector": true,
            },
          },
          "saml": Object {
            "saml": Object {
              "enabled": true,
              "maxRedirectURLSize": ByteSizeValue {
                "valueInBytes": 2048,
              },
              "order": 0,
              "realm": "saml-realm",
              "showInSelector": true,
            },
          },
        },
        "selector": Object {
          "enabled": false,
        },
        "sortedProviders": Array [
          Object {
            "name": "saml",
            "order": 0,
            "type": "saml",
          },
          Object {
            "name": "basic",
            "order": 1,
            "type": "basic",
          },
        ],
      }
    `);
  });

  it('does not automatically set `authc.selector.enabled` to `true` if legacy `authc.providers` format is used', () => {
    expect(
      createConfig(
        ConfigSchema.validate({
          authc: { providers: ['saml', 'basic'], saml: { realm: 'saml-realm' } },
        }),
        loggingSystemMock.create().get(),
        { isTLSEnabled: true }
      ).authc.selector.enabled
    ).toBe(false);

    // But keep it as `true` if it's explicitly set.
    expect(
      createConfig(
        ConfigSchema.validate({
          authc: {
            selector: { enabled: true },
            providers: ['saml', 'basic'],
            saml: { realm: 'saml-realm' },
          },
        }),
        loggingSystemMock.create().get(),
        { isTLSEnabled: true }
      ).authc.selector.enabled
    ).toBe(true);
  });

  it('does not automatically set `authc.selector.enabled` to `true` if less than 2 providers must be shown there', () => {
    expect(
      createConfig(
        ConfigSchema.validate({
          authc: {
            providers: {
              basic: { basic1: { order: 0 } },
              saml: {
                saml1: { order: 1, realm: 'saml1', showInSelector: false },
                saml2: { enabled: false, order: 2, realm: 'saml2' },
              },
            },
          },
        }),
        loggingSystemMock.create().get(),
        { isTLSEnabled: true }
      ).authc.selector.enabled
    ).toBe(false);
  });

  it('automatically set `authc.selector.enabled` to `true` if more than 1 provider must be shown there', () => {
    expect(
      createConfig(
        ConfigSchema.validate({
          authc: {
            providers: {
              basic: { basic1: { order: 0 } },
              saml: { saml1: { order: 1, realm: 'saml1' }, saml2: { order: 2, realm: 'saml2' } },
            },
          },
        }),
        loggingSystemMock.create().get(),
        { isTLSEnabled: true }
      ).authc.selector.enabled
    ).toBe(true);
  });

  it('correctly sorts providers based on the `order`', () => {
    expect(
      createConfig(
        ConfigSchema.validate({
          authc: {
            providers: {
              basic: { basic1: { order: 3 } },
              saml: { saml1: { order: 2, realm: 'saml1' }, saml2: { order: 1, realm: 'saml2' } },
              oidc: { oidc1: { order: 0, realm: 'oidc1' }, oidc2: { order: 4, realm: 'oidc2' } },
            },
          },
        }),
        loggingSystemMock.create().get(),
        { isTLSEnabled: true }
      ).authc.sortedProviders
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "name": "oidc1",
          "order": 0,
          "type": "oidc",
        },
        Object {
          "name": "saml2",
          "order": 1,
          "type": "saml",
        },
        Object {
          "name": "saml1",
          "order": 2,
          "type": "saml",
        },
        Object {
          "name": "basic1",
          "order": 3,
          "type": "basic",
        },
        Object {
          "name": "oidc2",
          "order": 4,
          "type": "oidc",
        },
      ]
    `);
  });
});
