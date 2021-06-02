/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';

import { securityConfigDeprecationProvider } from './config_deprecations';

const applyConfigDeprecations = (settings: Record<string, any> = {}) => {
  const deprecations = securityConfigDeprecationProvider(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const { config: migrated } = applyDeprecations(
    settings,
    deprecations.map((deprecation) => ({
      deprecation,
      path: 'xpack.security',
    })),
    () => ({ message }) => deprecationMessages.push(message)
  );
  return {
    messages: deprecationMessages,
    migrated,
  };
};

describe('Config Deprecations', () => {
  it('does not report deprecations for default configuration', () => {
    const defaultConfig = { xpack: { security: {} } };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(defaultConfig));
    expect(migrated).toEqual(defaultConfig);
    expect(messages).toHaveLength(0);
  });

  it('renames sessionTimeout to session.idleTimeout', () => {
    const config = {
      xpack: {
        security: {
          sessionTimeout: 123,
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.sessionTimeout).not.toBeDefined();
    expect(migrated.xpack.security.session.idleTimeout).toEqual(123);
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "\\"xpack.security.sessionTimeout\\" is deprecated and has been replaced by \\"xpack.security.session.idleTimeout\\"",
      ]
    `);
  });

  it('renames audit.appender.kind to audit.appender.type', () => {
    const config = {
      xpack: {
        security: {
          audit: {
            appender: {
              kind: 'console',
            },
          },
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.audit.appender.kind).not.toBeDefined();
    expect(migrated.xpack.security.audit.appender.type).toEqual('console');
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "\\"xpack.security.audit.appender.kind\\" is deprecated and has been replaced by \\"xpack.security.audit.appender.type\\"",
      ]
    `);
  });

  it('renames audit.appender.layout.kind to audit.appender.layout.type', () => {
    const config = {
      xpack: {
        security: {
          audit: {
            appender: {
              layout: { kind: 'pattern' },
            },
          },
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.audit.appender.layout.kind).not.toBeDefined();
    expect(migrated.xpack.security.audit.appender.layout.type).toEqual('pattern');
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "\\"xpack.security.audit.appender.layout.kind\\" is deprecated and has been replaced by \\"xpack.security.audit.appender.layout.type\\"",
      ]
    `);
  });

  it('renames audit.appender.policy.kind to audit.appender.policy.type', () => {
    const config = {
      xpack: {
        security: {
          audit: {
            appender: {
              policy: { kind: 'time-interval' },
            },
          },
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.audit.appender.policy.kind).not.toBeDefined();
    expect(migrated.xpack.security.audit.appender.policy.type).toEqual('time-interval');
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "\\"xpack.security.audit.appender.policy.kind\\" is deprecated and has been replaced by \\"xpack.security.audit.appender.policy.type\\"",
      ]
    `);
  });

  it('renames audit.appender.strategy.kind to audit.appender.strategy.type', () => {
    const config = {
      xpack: {
        security: {
          audit: {
            appender: {
              strategy: { kind: 'numeric' },
            },
          },
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.audit.appender.strategy.kind).not.toBeDefined();
    expect(migrated.xpack.security.audit.appender.strategy.type).toEqual('numeric');
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "\\"xpack.security.audit.appender.strategy.kind\\" is deprecated and has been replaced by \\"xpack.security.audit.appender.strategy.type\\"",
      ]
    `);
  });

  it('renames audit.appender.path to audit.appender.fileName', () => {
    const config = {
      xpack: {
        security: {
          audit: {
            appender: {
              type: 'file',
              path: './audit.log',
            },
          },
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.audit.appender.path).not.toBeDefined();
    expect(migrated.xpack.security.audit.appender.fileName).toEqual('./audit.log');
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "\\"xpack.security.audit.appender.path\\" is deprecated and has been replaced by \\"xpack.security.audit.appender.fileName\\"",
      ]
    `);
  });

  it(`warns that 'authorization.legacyFallback.enabled' is unused`, () => {
    const config = {
      xpack: {
        security: {
          authorization: {
            legacyFallback: {
              enabled: true,
            },
          },
        },
      },
    };
    const { messages } = applyConfigDeprecations(cloneDeep(config));
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "xpack.security.authorization.legacyFallback.enabled is deprecated and is no longer used",
      ]
    `);
  });

  it(`warns that 'authc.saml.maxRedirectURLSize is unused`, () => {
    const config = {
      xpack: {
        security: {
          authc: {
            saml: {
              maxRedirectURLSize: 123,
            },
          },
        },
      },
    };
    const { messages } = applyConfigDeprecations(cloneDeep(config));
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "xpack.security.authc.saml.maxRedirectURLSize is deprecated and is no longer used",
      ]
    `);
  });

  it(`warns that 'xpack.security.authc.providers.saml.<provider-name>.maxRedirectURLSize' is unused`, () => {
    const config = {
      xpack: {
        security: {
          authc: {
            providers: {
              saml: {
                saml1: {
                  maxRedirectURLSize: 123,
                },
              },
            },
          },
        },
      },
    };
    const { messages } = applyConfigDeprecations(cloneDeep(config));
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "\`xpack.security.authc.providers.saml.<provider-name>.maxRedirectURLSize\` is deprecated and is no longer used",
      ]
    `);
  });

  it(`warns when 'xpack.security.authc.providers' is an array of strings`, () => {
    const config = {
      xpack: {
        security: {
          authc: {
            providers: ['basic', 'saml'],
          },
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated).toEqual(config);
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Defining \\"xpack.security.authc.providers\\" as an array of provider types is deprecated. Use extended \\"object\\" format instead.",
      ]
    `);
  });

  it(`warns when both the basic and token providers are enabled`, () => {
    const config = {
      xpack: {
        security: {
          authc: {
            providers: ['basic', 'token'],
          },
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated).toEqual(config);
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Defining \\"xpack.security.authc.providers\\" as an array of provider types is deprecated. Use extended \\"object\\" format instead.",
        "Enabling both \`basic\` and \`token\` authentication providers in \`xpack.security.authc.providers\` is deprecated. Login page will only use \`token\` provider.",
      ]
    `);
  });

  it('warns when the security plugin is disabled', () => {
    const config = {
      xpack: {
        security: {
          enabled: false,
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated).toEqual(config);
    expect(messages).toMatchInlineSnapshot(`
        Array [
          "Disabling the security plugin (\`xpack.security.enabled\`) will not be supported in the next major version (8.0). To turn off security features, disable them in Elasticsearch instead.",
        ]
    `);
  });

  it('does not warn when the security plugin is enabled', () => {
    const config = {
      xpack: {
        security: {
          enabled: true,
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated).toEqual(config);
    expect(messages).toHaveLength(0);
  });
});
