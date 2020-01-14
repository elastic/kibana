/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('crypto', () => ({ randomBytes: jest.fn() }));

import { first } from 'rxjs/operators';
import { loggingServiceMock, coreMock } from '../../../../src/core/server/mocks';
import { createConfig$, ConfigSchema } from './config';

describe('config schema', () => {
  it('generates proper defaults', () => {
    expect(ConfigSchema.validate({})).toMatchInlineSnapshot(`
      Object {
        "authc": Object {
          "providers": Array [
            "basic",
          ],
        },
        "cookieName": "sid",
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "loginAssistanceMessage": "",
        "public": Object {},
        "secureCookies": false,
        "session": Object {
          "idleTimeout": null,
          "lifespan": null,
        },
      }
    `);

    expect(ConfigSchema.validate({}, { dist: false })).toMatchInlineSnapshot(`
      Object {
        "authc": Object {
          "providers": Array [
            "basic",
          ],
        },
        "cookieName": "sid",
        "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "loginAssistanceMessage": "",
        "public": Object {},
        "secureCookies": false,
        "session": Object {
          "idleTimeout": null,
          "lifespan": null,
        },
      }
    `);

    expect(ConfigSchema.validate({}, { dist: true })).toMatchInlineSnapshot(`
      Object {
        "authc": Object {
          "providers": Array [
            "basic",
          ],
        },
        "cookieName": "sid",
        "loginAssistanceMessage": "",
        "public": Object {},
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
      `"[encryptionKey]: value is [foo] but it must have a minimum length of [32]."`
    );

    expect(() =>
      ConfigSchema.validate({ encryptionKey: 'foo' }, { dist: true })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[encryptionKey]: value is [foo] but it must have a minimum length of [32]."`
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
- [public.protocol.0]: expected value to equal [http] but got [ftp]
- [public.protocol.1]: expected value to equal [https] but got [ftp]"
`);

      expect(() => ConfigSchema.validate({ public: { protocol: 'some-protocol' } }))
        .toThrowErrorMatchingInlineSnapshot(`
"[public.protocol]: types that failed validation:
- [public.protocol.0]: expected value to equal [http] but got [some-protocol]
- [public.protocol.1]: expected value to equal [https] but got [some-protocol]"
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
        `"[public.hostname]: value is [http://elastic.co] but it must be a valid hostname (see RFC 1123)."`
      );

      expect(() =>
        ConfigSchema.validate({ public: { hostname: 'localhost:5601' } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[public.hostname]: value is [localhost:5601] but it must be a valid hostname (see RFC 1123)."`
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
        `"[public.port]: Value is [-1] but it must be equal to or greater than [0]."`
      );

      expect(() =>
        ConfigSchema.validate({ public: { port: 65536 } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[public.port]: Value is [65536] but it must be equal to or lower than [65535]."`
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
      expect(() =>
        ConfigSchema.validate({ authc: { providers: ['oidc'] } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[authc.oidc.realm]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        ConfigSchema.validate({ authProviders: ['oidc'] })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[authc.oidc.realm]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        ConfigSchema.validate({ authc: { providers: ['oidc'], oidc: {} } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[authc.oidc.realm]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        ConfigSchema.validate({ authProviders: ['oidc'], authc: { oidc: {} } })
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
                                          "oidc": Object {
                                            "realm": "realm-1",
                                          },
                                          "providers": Array [
                                            "oidc",
                                          ],
                                        }
                              `);

      expect(
        ConfigSchema.validate({
          authProviders: ['oidc'],
          authc: { oidc: { realm: 'realm-1' } },
        }).authc
      ).toMatchInlineSnapshot(`
                                Object {
                                  "oidc": Object {
                                    "realm": "realm-1",
                                  },
                                  "providers": Array [
                                    "oidc",
                                  ],
                                }
                        `);
    });

    it(`returns a validation error when authc.providers is "['oidc', 'basic']" and realm is unspecified`, async () => {
      expect(() =>
        ConfigSchema.validate({ authc: { providers: ['oidc', 'basic'] } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[authc.oidc.realm]: expected value of type [string] but got [undefined]"`
      );

      expect(() =>
        ConfigSchema.validate({ authProviders: ['oidc', 'basic'] })
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
                                          "oidc": Object {
                                            "realm": "realm-1",
                                          },
                                          "providers": Array [
                                            "oidc",
                                            "basic",
                                          ],
                                        }
                              `);

      expect(
        ConfigSchema.validate({
          authProviders: ['oidc', 'basic'],
          authc: { oidc: { realm: 'realm-1' } },
        }).authc
      ).toMatchInlineSnapshot(`
                                Object {
                                  "oidc": Object {
                                    "realm": "realm-1",
                                  },
                                  "providers": Array [
                                    "oidc",
                                    "basic",
                                  ],
                                }
                        `);
    });

    it(`realm is not allowed when authc.providers is "['basic']"`, async () => {
      expect(() =>
        ConfigSchema.validate({ authc: { providers: ['basic'], oidc: { realm: 'realm-1' } } })
      ).toThrowErrorMatchingInlineSnapshot(`"[authc.oidc]: a value wasn't expected to be present"`);

      expect(() =>
        ConfigSchema.validate({ authProviders: ['basic'], authc: { oidc: { realm: 'realm-1' } } })
      ).toThrowErrorMatchingInlineSnapshot(`"[authc.oidc]: a value wasn't expected to be present"`);
    });
  });

  describe('authc.saml', () => {
    it('does not fail if authc.providers includes `saml`, but `saml.realm` is not specified', async () => {
      expect(ConfigSchema.validate({ authc: { providers: ['saml'] } }).authc)
        .toMatchInlineSnapshot(`
        Object {
          "providers": Array [
            "saml",
          ],
          "saml": Object {
            "maxRedirectURLSize": ByteSizeValue {
              "valueInBytes": 2048,
            },
          },
        }
      `);

      expect(ConfigSchema.validate({ authProviders: ['saml'] }).authc).toMatchInlineSnapshot(`
        Object {
          "providers": Array [
            "saml",
          ],
          "saml": Object {
            "maxRedirectURLSize": ByteSizeValue {
              "valueInBytes": 2048,
            },
          },
        }
      `);

      expect(ConfigSchema.validate({ authc: { providers: ['saml'], saml: {} } }).authc)
        .toMatchInlineSnapshot(`
        Object {
          "providers": Array [
            "saml",
          ],
          "saml": Object {
            "maxRedirectURLSize": ByteSizeValue {
              "valueInBytes": 2048,
            },
          },
        }
      `);

      expect(ConfigSchema.validate({ authProviders: ['saml'], authc: { saml: {} } }).authc)
        .toMatchInlineSnapshot(`
        Object {
          "providers": Array [
            "saml",
          ],
          "saml": Object {
            "maxRedirectURLSize": ByteSizeValue {
              "valueInBytes": 2048,
            },
          },
        }
      `);

      expect(
        ConfigSchema.validate({
          authc: { providers: ['saml'], saml: { realm: 'realm-1' } },
        }).authc
      ).toMatchInlineSnapshot(`
        Object {
          "providers": Array [
            "saml",
          ],
          "saml": Object {
            "maxRedirectURLSize": ByteSizeValue {
              "valueInBytes": 2048,
            },
            "realm": "realm-1",
          },
        }
      `);

      expect(
        ConfigSchema.validate({
          authProviders: ['saml'],
          authc: { saml: { realm: 'realm-1' } },
        }).authc
      ).toMatchInlineSnapshot(`
                                Object {
                                  "providers": Array [
                                    "saml",
                                  ],
                                  "saml": Object {
                                    "maxRedirectURLSize": ByteSizeValue {
                                      "valueInBytes": 2048,
                                    },
                                    "realm": "realm-1",
                                  },
                                }
                        `);
    });

    it('`realm` is not allowed if saml provider is not enabled', async () => {
      expect(() =>
        ConfigSchema.validate({ authc: { providers: ['basic'], saml: { realm: 'realm-1' } } })
      ).toThrowErrorMatchingInlineSnapshot(`"[authc.saml]: a value wasn't expected to be present"`);

      expect(() =>
        ConfigSchema.validate({ authProviders: ['basic'], authc: { saml: { realm: 'realm-1' } } })
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

describe('createConfig$()', () => {
  const mockAndCreateConfig = async (isTLSEnabled: boolean, value = {}, context?: any) => {
    const contextMock = coreMock.createPluginInitializerContext(
      // we must use validate to avoid errors in `createConfig$`
      ConfigSchema.validate(value, context)
    );
    return await createConfig$(contextMock, isTLSEnabled)
      .pipe(first())
      .toPromise()
      .then(config => ({ contextMock, config }));
  };
  it('should log a warning and set xpack.security.encryptionKey if not set', async () => {
    const mockRandomBytes = jest.requireMock('crypto').randomBytes;
    mockRandomBytes.mockReturnValue('ab'.repeat(16));

    const { contextMock, config } = await mockAndCreateConfig(true, {}, { dist: true });
    expect(config.encryptionKey).toEqual('ab'.repeat(16));

    expect(loggingServiceMock.collect(contextMock.logger).warn).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "Generating a random key for xpack.security.encryptionKey. To prevent sessions from being invalidated on restart, please set xpack.security.encryptionKey in kibana.yml",
                          ],
                        ]
                `);
  });

  it('should log a warning if SSL is not configured', async () => {
    const { contextMock, config } = await mockAndCreateConfig(false, {});
    expect(config.secureCookies).toEqual(false);

    expect(loggingServiceMock.collect(contextMock.logger).warn).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "Session cookies will be transmitted over insecure connections. This is not recommended.",
                          ],
                        ]
                `);
  });

  it('should log a warning if SSL is not configured yet secure cookies are being used', async () => {
    const { contextMock, config } = await mockAndCreateConfig(false, { secureCookies: true });
    expect(config.secureCookies).toEqual(true);

    expect(loggingServiceMock.collect(contextMock.logger).warn).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "Using secure cookies, but SSL is not enabled inside Kibana. SSL must be configured outside of Kibana to function properly.",
                          ],
                        ]
                `);
  });

  it('should set xpack.security.secureCookies if SSL is configured', async () => {
    const { contextMock, config } = await mockAndCreateConfig(true, {});
    expect(config.secureCookies).toEqual(true);

    expect(loggingServiceMock.collect(contextMock.logger).warn).toEqual([]);
  });
});
