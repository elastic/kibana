/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  constants: jest.requireActual('crypto').constants,
}));

jest.mock('@kbn/utils', () => ({
  getLogsPath: () => '/mock/kibana/logs/path',
}));

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { ConfigSchema, createConfig } from './config';

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
              "bearer",
            ],
          },
          "providers": Object {
            "anonymous": undefined,
            "basic": Object {
              "basic": Object {
                "accessAgreement": undefined,
                "description": undefined,
                "enabled": true,
                "hint": undefined,
                "icon": undefined,
                "order": 0,
                "session": Object {
                  "idleTimeout": undefined,
                  "lifespan": undefined,
                },
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
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "loginAssistanceMessage": "",
        "public": Object {},
        "secureCookies": false,
        "session": Object {
          "cleanupInterval": "PT1H",
          "idleTimeout": "PT8H",
          "lifespan": "P30D",
        },
        "showInsecureClusterWarning": true,
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
              "bearer",
            ],
          },
          "providers": Object {
            "anonymous": undefined,
            "basic": Object {
              "basic": Object {
                "accessAgreement": undefined,
                "description": undefined,
                "enabled": true,
                "hint": undefined,
                "icon": undefined,
                "order": 0,
                "session": Object {
                  "idleTimeout": undefined,
                  "lifespan": undefined,
                },
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
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "loginAssistanceMessage": "",
        "public": Object {},
        "secureCookies": false,
        "session": Object {
          "cleanupInterval": "PT1H",
          "idleTimeout": "PT8H",
          "lifespan": "P30D",
        },
        "showInsecureClusterWarning": true,
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
              "bearer",
            ],
          },
          "providers": Object {
            "anonymous": undefined,
            "basic": Object {
              "basic": Object {
                "accessAgreement": undefined,
                "description": undefined,
                "enabled": true,
                "hint": undefined,
                "icon": undefined,
                "order": 0,
                "session": Object {
                  "idleTimeout": undefined,
                  "lifespan": undefined,
                },
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
        "loginAssistanceMessage": "",
        "public": Object {},
        "secureCookies": false,
        "session": Object {
          "cleanupInterval": "PT1H",
          "idleTimeout": "PT8H",
          "lifespan": "P30D",
        },
        "showInsecureClusterWarning": true,
      }
    `);
  });

  it('should throw error if xpack.security.encryptionKey is less than 32 characters', () => {
    expect(() => ConfigSchema.validate({ encryptionKey: 'foo' })).toThrow(
      '[encryptionKey]: value has length [3] but it must have a minimum length of [32].'
    );

    expect(() => ConfigSchema.validate({ encryptionKey: 'foo' }, { dist: true })).toThrow(
      '[encryptionKey]: value has length [3] but it must have a minimum length of [32].'
    );
  });

  describe('public', () => {
    it('properly validates `protocol`', async () => {
      expect(ConfigSchema.validate({ public: { protocol: 'http' } }).public).toMatchInlineSnapshot(`
        Object {
          "protocol": "http",
        }
      `);

      expect(ConfigSchema.validate({ public: { protocol: 'https' } }).public)
        .toMatchInlineSnapshot(`
        Object {
          "protocol": "https",
        }
      `);

      expect(() => ConfigSchema.validate({ public: { protocol: 'ftp' } }))
        .toThrowErrorMatchingInlineSnapshot(`
        "[public.protocol]: types that failed validation:
        - [public.protocol.0]: expected value to equal [http]
        - [public.protocol.1]: expected value to equal [https]"
      `);

      expect(() => ConfigSchema.validate({ public: { protocol: 'some-protocol' } }))
        .toThrowErrorMatchingInlineSnapshot(`
        "[public.protocol]: types that failed validation:
        - [public.protocol.0]: expected value to equal [http]
        - [public.protocol.1]: expected value to equal [https]"
      `);
    });

    it('properly validates `hostname`', async () => {
      expect(ConfigSchema.validate({ public: { hostname: 'elastic.co' } }).public)
        .toMatchInlineSnapshot(`
        Object {
          "hostname": "elastic.co",
        }
      `);

      expect(ConfigSchema.validate({ public: { hostname: '192.168.1.1' } }).public)
        .toMatchInlineSnapshot(`
        Object {
          "hostname": "192.168.1.1",
        }
      `);

      expect(ConfigSchema.validate({ public: { hostname: '::1' } }).public).toMatchInlineSnapshot(`
        Object {
          "hostname": "::1",
        }
      `);

      expect(() =>
        ConfigSchema.validate({ public: { hostname: 'http://elastic.co' } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[public.hostname]: value must be a valid hostname (see RFC 1123)."`
      );

      expect(() =>
        ConfigSchema.validate({ public: { hostname: 'localhost:5601' } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[public.hostname]: value must be a valid hostname (see RFC 1123)."`
      );
    });

    it('properly validates `port`', async () => {
      expect(ConfigSchema.validate({ public: { port: 1234 } }).public).toMatchInlineSnapshot(`
        Object {
          "port": 1234,
        }
      `);

      expect(ConfigSchema.validate({ public: { port: 0 } }).public).toMatchInlineSnapshot(`
        Object {
          "port": 0,
        }
      `);

      expect(ConfigSchema.validate({ public: { port: 65535 } }).public).toMatchInlineSnapshot(`
        Object {
          "port": 65535,
        }
      `);

      expect(() =>
        ConfigSchema.validate({ public: { port: -1 } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[public.port]: Value must be equal to or greater than [0]."`
      );

      expect(() =>
        ConfigSchema.validate({ public: { port: 65536 } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[public.port]: Value must be equal to or lower than [65535]."`
      );

      expect(() =>
        ConfigSchema.validate({ public: { port: '56x1' } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[public.port]: expected value of type [number] but got [string]"`
      );
    });
  });

  describe('authc.oidc', () => {
    it(`returns a validation error when authc.providers is "['oidc']" and realm is unspecified`, async () => {
      expect(() => ConfigSchema.validate({ authc: { providers: ['oidc'] } })).toThrow(
        '[authc.oidc.realm]: expected value of type [string] but got [undefined]'
      );

      expect(() => ConfigSchema.validate({ authc: { providers: ['oidc'], oidc: {} } })).toThrow(
        '[authc.oidc.realm]: expected value of type [string] but got [undefined]'
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
              "bearer",
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
      expect(() => ConfigSchema.validate({ authc: { providers: ['oidc', 'basic'] } })).toThrow(
        '[authc.oidc.realm]: expected value of type [string] but got [undefined]'
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
              "bearer",
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
      ).toThrow("[authc.oidc]: a value wasn't expected to be present");
    });
  });

  describe('authc.saml', () => {
    it('does not fail if authc.providers includes `saml`, but `saml.realm` is not specified', async () => {
      expect(ConfigSchema.validate({ authc: { providers: ['saml'] } }).authc)
        .toMatchInlineSnapshot(`
        Object {
          "http": Object {
            "autoSchemesEnabled": true,
            "enabled": true,
            "schemes": Array [
              "apikey",
              "bearer",
            ],
          },
          "providers": Array [
            "saml",
          ],
          "saml": Object {},
          "selector": Object {},
        }
      `);

      expect(ConfigSchema.validate({ authc: { providers: ['saml'], saml: {} } }).authc)
        .toMatchInlineSnapshot(`
        Object {
          "http": Object {
            "autoSchemesEnabled": true,
            "enabled": true,
            "schemes": Array [
              "apikey",
              "bearer",
            ],
          },
          "providers": Array [
            "saml",
          ],
          "saml": Object {},
          "selector": Object {},
        }
      `);

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
              "bearer",
            ],
          },
          "providers": Array [
            "saml",
          ],
          "saml": Object {
            "realm": "realm-1",
          },
          "selector": Object {},
        }
      `);
    });

    it('`realm` is not allowed if saml provider is not enabled', async () => {
      expect(() =>
        ConfigSchema.validate({ authc: { providers: ['basic'], saml: { realm: 'realm-1' } } })
      ).toThrow("[authc.saml]: a value wasn't expected to be present");
    });

    it('`maxRedirectURLSize` accepts any positive value that can coerce to `ByteSizeValue`', async () => {
      expect(
        ConfigSchema.validate({
          authc: { providers: ['saml'], saml: { realm: 'realm-1' } },
        }).authc.saml
      ).toMatchInlineSnapshot(`
        Object {
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
        ).toThrow(
          '[authc.providers.1.basic.basic1.order]: expected value of type [number] but got [undefined]'
        );
      });

      it('cannot be hidden from selector', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: {
              providers: { basic: { basic1: { order: 0, showInSelector: false } } },
            },
          })
        ).toThrow(
          '[authc.providers.1.basic.basic1.showInSelector]: `basic` provider only supports `true` in `showInSelector`.'
        );
      });

      it('can have only provider of this type', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { basic: { basic1: { order: 0 }, basic2: { order: 1 } } } },
          })
        ).toThrow('[authc.providers.1.basic]: Only one "basic" provider can be configured');
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
                "session": Object {},
                "showInSelector": true,
              },
            },
          }
        `);
      });

      it('can be successfully validated with session config overrides', () => {
        expect(
          ConfigSchema.validate({
            authc: {
              providers: {
                basic: { basic1: { order: 0, session: { idleTimeout: 123, lifespan: 546 } } },
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
                "session": Object {
                  "idleTimeout": "PT0.123S",
                  "lifespan": "PT0.546S",
                },
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
        ).toThrow(
          '[authc.providers.1.token.token1.order]: expected value of type [number] but got [undefined]'
        );
      });

      it('cannot be hidden from selector', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: {
              providers: { token: { token1: { order: 0, showInSelector: false } } },
            },
          })
        ).toThrow(
          '[authc.providers.1.token.token1.showInSelector]: `token` provider only supports `true` in `showInSelector`.'
        );
      });

      it('can have only provider of this type', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { token: { token1: { order: 0 }, token2: { order: 1 } } } },
          })
        ).toThrow('[authc.providers.1.token]: Only one "token" provider can be configured');
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
                "session": Object {},
                "showInSelector": true,
              },
            },
          }
        `);
      });

      it('can be successfully validated with session config overrides', () => {
        expect(
          ConfigSchema.validate({
            authc: {
              providers: {
                token: { token1: { order: 0, session: { idleTimeout: 123, lifespan: 546 } } },
              },
            },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "token": Object {
              "token1": Object {
                "description": "Log in with Elasticsearch",
                "enabled": true,
                "icon": "logoElasticsearch",
                "order": 0,
                "session": Object {
                  "idleTimeout": "PT0.123S",
                  "lifespan": "PT0.546S",
                },
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
        ).toThrow(
          '[authc.providers.1.pki.pki1.order]: expected value of type [number] but got [undefined]'
        );
      });

      it('can have only provider of this type', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { pki: { pki1: { order: 0 }, pki2: { order: 1 } } } },
          })
        ).toThrow('[authc.providers.1.pki]: Only one "pki" provider can be configured');
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
                "session": Object {},
                "showInSelector": true,
              },
            },
          }
        `);
      });

      it('can be successfully validated with session config overrides', () => {
        expect(
          ConfigSchema.validate({
            authc: {
              providers: {
                pki: { pki1: { order: 0, session: { idleTimeout: 123, lifespan: 546 } } },
              },
            },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "pki": Object {
              "pki1": Object {
                "enabled": true,
                "order": 0,
                "session": Object {
                  "idleTimeout": "PT0.123S",
                  "lifespan": "PT0.546S",
                },
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
        ).toThrow(
          '[authc.providers.1.kerberos.kerberos1.order]: expected value of type [number] but got [undefined]'
        );
      });

      it('can have only provider of this type', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: {
              providers: { kerberos: { kerberos1: { order: 0 }, kerberos2: { order: 1 } } },
            },
          })
        ).toThrow('[authc.providers.1.kerberos]: Only one "kerberos" provider can be configured');
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
                "session": Object {},
                "showInSelector": true,
              },
            },
          }
        `);
      });

      it('can be successfully validated with session config overrides', () => {
        expect(
          ConfigSchema.validate({
            authc: {
              providers: {
                kerberos: { kerberos1: { order: 0, session: { idleTimeout: 123, lifespan: 546 } } },
              },
            },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "kerberos": Object {
              "kerberos1": Object {
                "enabled": true,
                "order": 0,
                "session": Object {
                  "idleTimeout": "PT0.123S",
                  "lifespan": "PT0.546S",
                },
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
        ).toThrow(
          '[authc.providers.1.oidc.oidc1.order]: expected value of type [number] but got [undefined]'
        );
      });

      it('requires `realm`', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { oidc: { oidc1: { order: 0 } } } },
          })
        ).toThrow(
          '[authc.providers.1.oidc.oidc1.realm]: expected value of type [string] but got [undefined]'
        );
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
                "session": Object {},
                "showInSelector": true,
              },
              "oidc2": Object {
                "enabled": true,
                "order": 1,
                "realm": "oidc2",
                "session": Object {},
                "showInSelector": true,
              },
            },
          }
        `);
      });

      it('can be successfully validated with session config overrides', () => {
        expect(
          ConfigSchema.validate({
            authc: {
              providers: {
                oidc: {
                  oidc1: { order: 0, realm: 'oidc1', session: { idleTimeout: 123 } },
                  oidc2: { order: 1, realm: 'oidc2', session: { idleTimeout: 321, lifespan: 546 } },
                },
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
                "session": Object {
                  "idleTimeout": "PT0.123S",
                },
                "showInSelector": true,
              },
              "oidc2": Object {
                "enabled": true,
                "order": 1,
                "realm": "oidc2",
                "session": Object {
                  "idleTimeout": "PT0.321S",
                  "lifespan": "PT0.546S",
                },
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
        ).toThrow(
          '[authc.providers.1.saml.saml1.order]: expected value of type [number] but got [undefined]'
        );
      });

      it('requires `realm`', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { saml: { saml1: { order: 0 } } } },
          })
        ).toThrow(
          '[authc.providers.1.saml.saml1.realm]: expected value of type [string] but got [undefined]'
        );
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
                "order": 0,
                "realm": "saml1",
                "session": Object {},
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
                "session": Object {},
                "showInSelector": true,
                "useRelayStateDeepLink": false,
              },
              "saml3": Object {
                "enabled": true,
                "order": 2,
                "realm": "saml3",
                "session": Object {},
                "showInSelector": true,
                "useRelayStateDeepLink": true,
              },
            },
          }
        `);
      });

      it('can be successfully validated with session config overrides', () => {
        expect(
          ConfigSchema.validate({
            authc: {
              providers: {
                saml: {
                  saml1: { order: 0, realm: 'saml1', session: { idleTimeout: 123 } },
                  saml2: {
                    order: 1,
                    realm: 'saml2',
                    maxRedirectURLSize: '1kb',
                    session: { idleTimeout: 321, lifespan: 546 },
                  },
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
                "order": 0,
                "realm": "saml1",
                "session": Object {
                  "idleTimeout": "PT0.123S",
                },
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
                "session": Object {
                  "idleTimeout": "PT0.321S",
                  "lifespan": "PT0.546S",
                },
                "showInSelector": true,
                "useRelayStateDeepLink": false,
              },
              "saml3": Object {
                "enabled": true,
                "order": 2,
                "realm": "saml3",
                "session": Object {},
                "showInSelector": true,
                "useRelayStateDeepLink": true,
              },
            },
          }
        `);
      });
    });

    describe('`anonymous` provider', () => {
      it('requires `order`', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { anonymous: { anonymous1: { enabled: true } } } },
          })
        ).toThrow(
          '[authc.providers.1.anonymous.anonymous1.order]: expected value of type [number] but got [undefined]'
        );
      });

      it('requires `credentials`', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: { providers: { anonymous: { anonymous1: { order: 0 } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
          "[authc.providers]: types that failed validation:
          - [authc.providers.0]: expected value of type [array] but got [Object]
          - [authc.providers.1.anonymous.anonymous1.credentials]: expected at least one defined value but got [undefined]"
        `);
      });

      it('requires both `username` and `password` in username/password `credentials`', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: {
              providers: {
                anonymous: { anonymous1: { order: 0, credentials: { username: 'some-user' } } },
              },
            },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
          "[authc.providers]: types that failed validation:
          - [authc.providers.0]: expected value of type [array] but got [Object]
          - [authc.providers.1.anonymous.anonymous1.credentials]: types that failed validation:
           - [credentials.0]: expected value to equal [elasticsearch_anonymous_user]
           - [credentials.1.password]: expected value of type [string] but got [undefined]
           - [credentials.2.apiKey]: expected at least one defined value but got [undefined]"
        `);

        expect(() =>
          ConfigSchema.validate({
            authc: {
              providers: {
                anonymous: { anonymous1: { order: 0, credentials: { password: 'some-pass' } } },
              },
            },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
          "[authc.providers]: types that failed validation:
          - [authc.providers.0]: expected value of type [array] but got [Object]
          - [authc.providers.1.anonymous.anonymous1.credentials]: types that failed validation:
           - [credentials.0]: expected value to equal [elasticsearch_anonymous_user]
           - [credentials.1.username]: expected value of type [string] but got [undefined]
           - [credentials.2.apiKey]: expected at least one defined value but got [undefined]"
        `);
      });

      it('can be successfully validated with username/password credentials', () => {
        expect(
          ConfigSchema.validate({
            authc: {
              providers: {
                anonymous: {
                  anonymous1: {
                    order: 0,
                    credentials: { username: 'some-user', password: 'some-pass' },
                  },
                },
              },
            },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "anonymous": Object {
              "anonymous1": Object {
                "credentials": Object {
                  "password": "some-pass",
                  "username": "some-user",
                },
                "description": "Continue as Guest",
                "enabled": true,
                "hint": "For anonymous users",
                "icon": "globe",
                "order": 0,
                "session": Object {
                  "idleTimeout": null,
                },
                "showInSelector": true,
              },
            },
          }
        `);
      });

      it('requires both `id` and `key` in extended `apiKey` format credentials', () => {
        expect(() =>
          ConfigSchema.validate({
            authc: {
              providers: {
                anonymous: { anonymous1: { order: 0, credentials: { apiKey: { id: 'some-id' } } } },
              },
            },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
          "[authc.providers]: types that failed validation:
          - [authc.providers.0]: expected value of type [array] but got [Object]
          - [authc.providers.1.anonymous.anonymous1.credentials]: types that failed validation:
           - [credentials.0]: expected value to equal [elasticsearch_anonymous_user]
           - [credentials.1.username]: expected value of type [string] but got [undefined]
           - [credentials.2.apiKey]: types that failed validation:
            - [credentials.apiKey.0.key]: expected value of type [string] but got [undefined]
            - [credentials.apiKey.1]: expected value of type [string] but got [Object]"
        `);

        expect(() =>
          ConfigSchema.validate({
            authc: {
              providers: {
                anonymous: {
                  anonymous1: { order: 0, credentials: { apiKey: { key: 'some-key' } } },
                },
              },
            },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
          "[authc.providers]: types that failed validation:
          - [authc.providers.0]: expected value of type [array] but got [Object]
          - [authc.providers.1.anonymous.anonymous1.credentials]: types that failed validation:
           - [credentials.0]: expected value to equal [elasticsearch_anonymous_user]
           - [credentials.1.username]: expected value of type [string] but got [undefined]
           - [credentials.2.apiKey]: types that failed validation:
            - [credentials.apiKey.0.id]: expected value of type [string] but got [undefined]
            - [credentials.apiKey.1]: expected value of type [string] but got [Object]"
        `);
      });

      it('can be successfully validated with API keys credentials', () => {
        expect(
          ConfigSchema.validate({
            authc: {
              providers: {
                anonymous: {
                  anonymous1: {
                    order: 0,
                    credentials: { apiKey: 'some-API-key' },
                  },
                },
              },
            },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "anonymous": Object {
              "anonymous1": Object {
                "credentials": Object {
                  "apiKey": "some-API-key",
                },
                "description": "Continue as Guest",
                "enabled": true,
                "hint": "For anonymous users",
                "icon": "globe",
                "order": 0,
                "session": Object {
                  "idleTimeout": null,
                },
                "showInSelector": true,
              },
            },
          }
        `);

        expect(
          ConfigSchema.validate({
            authc: {
              providers: {
                anonymous: {
                  anonymous1: {
                    order: 0,
                    credentials: { apiKey: { id: 'some-id', key: 'some-key' } },
                  },
                },
              },
            },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "anonymous": Object {
              "anonymous1": Object {
                "credentials": Object {
                  "apiKey": Object {
                    "id": "some-id",
                    "key": "some-key",
                  },
                },
                "description": "Continue as Guest",
                "enabled": true,
                "hint": "For anonymous users",
                "icon": "globe",
                "order": 0,
                "session": Object {
                  "idleTimeout": null,
                },
                "showInSelector": true,
              },
            },
          }
        `);
      });

      it('can be successfully validated with `elasticsearch_anonymous_user` credentials', () => {
        expect(
          ConfigSchema.validate({
            authc: {
              providers: {
                anonymous: {
                  anonymous1: {
                    order: 0,
                    credentials: 'elasticsearch_anonymous_user',
                  },
                },
              },
            },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "anonymous": Object {
              "anonymous1": Object {
                "credentials": "elasticsearch_anonymous_user",
                "description": "Continue as Guest",
                "enabled": true,
                "hint": "For anonymous users",
                "icon": "globe",
                "order": 0,
                "session": Object {
                  "idleTimeout": null,
                },
                "showInSelector": true,
              },
            },
          }
        `);
      });

      it('can be successfully validated with session config overrides', () => {
        expect(
          ConfigSchema.validate({
            authc: {
              providers: {
                anonymous: {
                  anonymous1: {
                    order: 1,
                    credentials: { username: 'some-user', password: 'some-pass' },
                    session: { idleTimeout: 321, lifespan: 546 },
                  },
                },
              },
            },
          }).authc.providers
        ).toMatchInlineSnapshot(`
          Object {
            "anonymous": Object {
              "anonymous1": Object {
                "credentials": Object {
                  "password": "some-pass",
                  "username": "some-user",
                },
                "description": "Continue as Guest",
                "enabled": true,
                "hint": "For anonymous users",
                "icon": "globe",
                "order": 1,
                "session": Object {
                  "idleTimeout": "PT0.321S",
                  "lifespan": "PT0.546S",
                },
                "showInSelector": true,
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
      ).toThrow(
        '[authc.providers.1]: Found multiple providers configured with the same name "provider1": [xpack.security.authc.providers.basic.provider1, xpack.security.authc.providers.saml.provider1]'
      );
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
      ).toThrow(
        '[authc.providers.1]: Found multiple providers configured with the same order "0": [xpack.security.authc.providers.basic.provider1, xpack.security.authc.providers.saml.provider2]'
      );
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
              "session": Object {},
              "showInSelector": true,
            },
            "basic2": Object {
              "description": "Log in with Elasticsearch",
              "enabled": false,
              "icon": "logoElasticsearch",
              "order": 1,
              "session": Object {},
              "showInSelector": true,
            },
          },
          "saml": Object {
            "basic1": Object {
              "enabled": false,
              "order": 3,
              "realm": "saml3",
              "session": Object {},
              "showInSelector": true,
              "useRelayStateDeepLink": false,
            },
            "saml1": Object {
              "enabled": true,
              "order": 1,
              "realm": "saml1",
              "session": Object {},
              "showInSelector": true,
              "useRelayStateDeepLink": false,
            },
            "saml2": Object {
              "enabled": true,
              "order": 2,
              "realm": "saml2",
              "session": Object {},
              "showInSelector": true,
              "useRelayStateDeepLink": false,
            },
          },
        }
      `);
    });
  });

  describe('session', () => {
    it('should throw error if xpack.security.session.cleanupInterval is less than 10 seconds', () => {
      expect(() => ConfigSchema.validate({ session: { cleanupInterval: '9s' } })).toThrow(
        '[session.cleanupInterval]: the value must be greater or equal to 10 seconds.'
      );
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
          "Generating a random key for xpack.security.encryptionKey. To prevent sessions from being invalidated on restart, please set xpack.security.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.",
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
            "bearer",
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
            "hasAccessAgreement": false,
            "name": "saml",
            "order": 0,
            "type": "saml",
          },
          Object {
            "hasAccessAgreement": false,
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

  it('indicates which providers have the access agreement enabled', () => {
    expect(
      createConfig(
        ConfigSchema.validate({
          authc: {
            providers: {
              basic: { basic1: { order: 3 } },
              saml: {
                saml1: { order: 2, realm: 'saml1', accessAgreement: { message: 'foo' } },
                saml2: { order: 1, realm: 'saml2' },
              },
              oidc: {
                oidc1: { order: 0, realm: 'oidc1', accessAgreement: { message: 'foo' } },
                oidc2: { order: 4, realm: 'oidc2' },
              },
            },
          },
        }),
        loggingSystemMock.create().get(),
        { isTLSEnabled: true }
      ).authc.sortedProviders
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "hasAccessAgreement": true,
          "name": "oidc1",
          "order": 0,
          "type": "oidc",
        },
        Object {
          "hasAccessAgreement": false,
          "name": "saml2",
          "order": 1,
          "type": "saml",
        },
        Object {
          "hasAccessAgreement": true,
          "name": "saml1",
          "order": 2,
          "type": "saml",
        },
        Object {
          "hasAccessAgreement": false,
          "name": "basic1",
          "order": 3,
          "type": "basic",
        },
        Object {
          "hasAccessAgreement": false,
          "name": "oidc2",
          "order": 4,
          "type": "oidc",
        },
      ]
    `);
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
          "hasAccessAgreement": false,
          "name": "oidc1",
          "order": 0,
          "type": "oidc",
        },
        Object {
          "hasAccessAgreement": false,
          "name": "saml2",
          "order": 1,
          "type": "saml",
        },
        Object {
          "hasAccessAgreement": false,
          "name": "saml1",
          "order": 2,
          "type": "saml",
        },
        Object {
          "hasAccessAgreement": false,
          "name": "basic1",
          "order": 3,
          "type": "basic",
        },
        Object {
          "hasAccessAgreement": false,
          "name": "oidc2",
          "order": 4,
          "type": "oidc",
        },
      ]
    `);
  });

  it('creates a default audit appender when audit logging is enabled', () => {
    expect(
      createConfig(
        ConfigSchema.validate({
          audit: {
            enabled: true,
          },
        }),
        loggingSystemMock.create().get(),
        { isTLSEnabled: true }
      ).audit.appender
    ).toMatchInlineSnapshot(`
      Object {
        "fileName": "/mock/kibana/logs/path/audit.log",
        "layout": Object {
          "type": "json",
        },
        "policy": Object {
          "interval": "PT24H",
          "type": "time-interval",
        },
        "strategy": Object {
          "max": 10,
          "type": "numeric",
        },
        "type": "rolling-file",
      }
    `);
  });

  it('does not create a default audit appender when audit logging is disabled', () => {
    expect(
      createConfig(
        ConfigSchema.validate({
          audit: {
            enabled: false,
          },
        }),
        loggingSystemMock.create().get(),
        { isTLSEnabled: true }
      ).audit.appender
    ).toBeUndefined();
  });

  it('accepts an audit appender', () => {
    expect(
      ConfigSchema.validate({
        audit: {
          appender: {
            type: 'file',
            fileName: '/path/to/file.txt',
            layout: {
              type: 'json',
            },
          },
        },
      }).audit.appender
    ).toMatchInlineSnapshot(`
      Object {
        "fileName": "/path/to/file.txt",
        "layout": Object {
          "type": "json",
        },
        "type": "file",
      }
    `);
  });

  it('rejects an appender if not fully configured', () => {
    expect(() =>
      ConfigSchema.validate({
        audit: {
          // no layout configured
          appender: {
            type: 'file',
            path: '/path/to/file.txt',
          },
        },
      })
    ).toThrow('[audit.appender.1.layout]: expected at least one defined value but got [undefined]');
  });

  describe('#getExpirationTimeouts', () => {
    function createMockConfig(config: Record<string, any> = {}) {
      return createConfig(ConfigSchema.validate(config), loggingSystemMock.createLogger(), {
        isTLSEnabled: false,
      });
    }

    it('returns default values if neither global nor provider specific settings are set', async () => {
      expect(createMockConfig().session.getExpirationTimeouts({ type: 'basic', name: 'basic1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT8H",
          "lifespan": "P30D",
        }
      `);
    });

    it('correctly handles explicitly disabled global settings', async () => {
      expect(
        createMockConfig({
          session: { idleTimeout: null, lifespan: null },
        }).session.getExpirationTimeouts({ type: 'basic', name: 'basic1' })
      ).toMatchInlineSnapshot(`
        Object {
          "idleTimeout": null,
          "lifespan": null,
        }
      `);

      expect(
        createMockConfig({
          session: { idleTimeout: 0, lifespan: 0 },
        }).session.getExpirationTimeouts({ type: 'basic', name: 'basic1' })
      ).toMatchInlineSnapshot(`
        Object {
          "idleTimeout": null,
          "lifespan": null,
        }
      `);
    });

    it('falls back to the global settings if provider does not override them', async () => {
      expect(
        createMockConfig({ session: { idleTimeout: 123 } }).session.getExpirationTimeouts({
          type: 'basic',
          name: 'basic1',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT0.123S",
          "lifespan": "P30D",
        }
      `);

      expect(
        createMockConfig({ session: { lifespan: 456 } }).session.getExpirationTimeouts({
          type: 'basic',
          name: 'basic1',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT8H",
          "lifespan": "PT0.456S",
        }
      `);

      expect(
        createMockConfig({
          session: { idleTimeout: 123, lifespan: 456 },
        }).session.getExpirationTimeouts({ type: 'basic', name: 'basic1' })
      ).toMatchInlineSnapshot(`
          Object {
            "idleTimeout": "PT0.123S",
            "lifespan": "PT0.456S",
          }
        `);
    });

    it('falls back to the global settings if provider is not known or is undefined', async () => {
      [{ type: 'some type', name: 'some name' }, undefined].forEach((provider) => {
        expect(
          createMockConfig({ session: { idleTimeout: 123 } }).session.getExpirationTimeouts(
            provider
          )
        ).toMatchInlineSnapshot(`
          Object {
            "idleTimeout": "PT0.123S",
            "lifespan": "P30D",
          }
        `);

        expect(
          createMockConfig({ session: { lifespan: 456 } }).session.getExpirationTimeouts(provider)
        ).toMatchInlineSnapshot(`
          Object {
            "idleTimeout": "PT8H",
            "lifespan": "PT0.456S",
          }
        `);

        expect(
          createMockConfig({
            session: { idleTimeout: 123, lifespan: 456 },
          }).session.getExpirationTimeouts(provider)
        ).toMatchInlineSnapshot(`
          Object {
            "idleTimeout": "PT0.123S",
            "lifespan": "PT0.456S",
          }
        `);
      });
    });

    it('uses provider overrides if specified (only idle timeout)', async () => {
      const configWithoutGlobal = createMockConfig({
        authc: {
          providers: {
            basic: { basic1: { order: 0, session: { idleTimeout: 321 } } },
            saml: { saml1: { order: 1, realm: 'saml-realm', session: { idleTimeout: 332211 } } },
          },
        },
        session: { idleTimeout: null },
      });
      expect(configWithoutGlobal.session.getExpirationTimeouts({ type: 'basic', name: 'basic1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT0.321S",
          "lifespan": "P30D",
        }
      `);
      expect(configWithoutGlobal.session.getExpirationTimeouts({ type: 'saml', name: 'saml1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT5M32.211S",
          "lifespan": "P30D",
        }
      `);

      const configWithGlobal = createMockConfig({
        authc: {
          providers: {
            basic: { basic1: { order: 0, session: { idleTimeout: 321 } } },
            saml: { saml1: { order: 1, realm: 'saml-realm', session: { idleTimeout: 332211 } } },
          },
        },
        session: { idleTimeout: 123 },
      });
      expect(configWithGlobal.session.getExpirationTimeouts({ type: 'basic', name: 'basic1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT0.321S",
          "lifespan": "P30D",
        }
      `);
      expect(configWithGlobal.session.getExpirationTimeouts({ type: 'saml', name: 'saml1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT5M32.211S",
          "lifespan": "P30D",
        }
      `);
    });

    it('uses provider overrides if specified (only lifespan)', async () => {
      const configWithoutGlobal = createMockConfig({
        authc: {
          providers: {
            basic: { basic1: { order: 0, session: { lifespan: 654 } } },
            saml: { saml1: { order: 1, realm: 'saml-realm', session: { lifespan: 665544 } } },
          },
        },
        session: { lifespan: null },
      });
      expect(configWithoutGlobal.session.getExpirationTimeouts({ type: 'basic', name: 'basic1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT8H",
          "lifespan": "PT0.654S",
        }
      `);
      expect(configWithoutGlobal.session.getExpirationTimeouts({ type: 'saml', name: 'saml1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT8H",
          "lifespan": "PT11M5.544S",
        }
      `);

      const configWithGlobal = createMockConfig({
        authc: {
          providers: {
            basic: { basic1: { order: 0, session: { lifespan: 654 } } },
            saml: { saml1: { order: 1, realm: 'saml-realm', session: { idleTimeout: 665544 } } },
          },
        },
        session: { lifespan: 456 },
      });
      expect(configWithGlobal.session.getExpirationTimeouts({ type: 'basic', name: 'basic1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT8H",
          "lifespan": "PT0.654S",
        }
      `);
      expect(configWithGlobal.session.getExpirationTimeouts({ type: 'saml', name: 'saml1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT11M5.544S",
          "lifespan": "PT0.456S",
        }
      `);
    });

    it('uses provider overrides if specified (both idle timeout and lifespan)', async () => {
      const configWithoutGlobal = createMockConfig({
        authc: {
          providers: {
            basic: { basic1: { order: 0, session: { idleTimeout: 321, lifespan: 654 } } },
            saml: {
              saml1: {
                order: 1,
                realm: 'saml-realm',
                session: { idleTimeout: 332211, lifespan: 665544 },
              },
            },
          },
        },
        session: { idleTimeout: null, lifespan: null },
      });
      expect(configWithoutGlobal.session.getExpirationTimeouts({ type: 'basic', name: 'basic1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT0.321S",
          "lifespan": "PT0.654S",
        }
      `);
      expect(configWithoutGlobal.session.getExpirationTimeouts({ type: 'saml', name: 'saml1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT5M32.211S",
          "lifespan": "PT11M5.544S",
        }
      `);

      const configWithGlobal = createMockConfig({
        authc: {
          providers: {
            basic: { basic1: { order: 0, session: { idleTimeout: 321, lifespan: 654 } } },
            saml: {
              saml1: {
                order: 1,
                realm: 'saml-realm',
                session: { idleTimeout: 332211, lifespan: 665544 },
              },
            },
          },
        },
        session: { idleTimeout: 123, lifespan: 456 },
      });
      expect(configWithGlobal.session.getExpirationTimeouts({ type: 'basic', name: 'basic1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT0.321S",
          "lifespan": "PT0.654S",
        }
      `);
      expect(configWithGlobal.session.getExpirationTimeouts({ type: 'saml', name: 'saml1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT5M32.211S",
          "lifespan": "PT11M5.544S",
        }
      `);
    });

    it('uses provider overrides if disabled (both idle timeout and lifespan)', async () => {
      const config = createMockConfig({
        authc: {
          providers: {
            basic: { basic1: { order: 0, session: { idleTimeout: null, lifespan: null } } },
            saml: {
              saml1: {
                order: 1,
                realm: 'saml-realm',
                session: { idleTimeout: 0, lifespan: 0 },
              },
            },
          },
        },
        session: { idleTimeout: 123, lifespan: 456 },
      });
      expect(config.session.getExpirationTimeouts({ type: 'basic', name: 'basic1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": null,
          "lifespan": null,
        }
      `);
      expect(config.session.getExpirationTimeouts({ type: 'saml', name: 'saml1' }))
        .toMatchInlineSnapshot(`
        Object {
          "idleTimeout": null,
          "lifespan": null,
        }
      `);
    });

    it('properly handles config for the anonymous provider', async () => {
      expect(
        createMockConfig({
          authc: {
            providers: {
              anonymous: {
                anonymous1: {
                  order: 0,
                  credentials: { username: 'some-user', password: 'some-pass' },
                },
              },
            },
          },
        }).session.getExpirationTimeouts({ type: 'anonymous', name: 'anonymous1' })
      ).toMatchInlineSnapshot(`
        Object {
          "idleTimeout": null,
          "lifespan": "P30D",
        }
      `);

      expect(
        createMockConfig({
          authc: {
            providers: {
              anonymous: {
                anonymous1: {
                  order: 0,
                  credentials: { username: 'some-user', password: 'some-pass' },
                },
              },
            },
          },
          session: { idleTimeout: 0, lifespan: null },
        }).session.getExpirationTimeouts({ type: 'anonymous', name: 'anonymous1' })
      ).toMatchInlineSnapshot(`
        Object {
          "idleTimeout": null,
          "lifespan": null,
        }
      `);

      expect(
        createMockConfig({
          authc: {
            providers: {
              anonymous: {
                anonymous1: {
                  order: 0,
                  credentials: { username: 'some-user', password: 'some-pass' },
                  session: { idleTimeout: 0, lifespan: null },
                },
              },
            },
          },
        }).session.getExpirationTimeouts({ type: 'anonymous', name: 'anonymous1' })
      ).toMatchInlineSnapshot(`
        Object {
          "idleTimeout": null,
          "lifespan": null,
        }
      `);

      expect(
        createMockConfig({
          authc: {
            providers: {
              anonymous: {
                anonymous1: {
                  order: 0,
                  credentials: { username: 'some-user', password: 'some-pass' },
                  session: { idleTimeout: 321, lifespan: 546 },
                },
              },
            },
          },
          session: { idleTimeout: null, lifespan: 0 },
        }).session.getExpirationTimeouts({ type: 'anonymous', name: 'anonymous1' })
      ).toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT0.321S",
          "lifespan": "PT0.546S",
        }
      `);

      expect(
        createMockConfig({
          authc: {
            providers: {
              anonymous: {
                anonymous1: {
                  order: 0,
                  credentials: { username: 'some-user', password: 'some-pass' },
                  session: { idleTimeout: 321, lifespan: 546 },
                },
              },
            },
          },
          session: { idleTimeout: 123, lifespan: 456 },
        }).session.getExpirationTimeouts({ type: 'anonymous', name: 'anonymous1' })
      ).toMatchInlineSnapshot(`
        Object {
          "idleTimeout": "PT0.321S",
          "lifespan": "PT0.546S",
        }
      `);
    });
  });
});
