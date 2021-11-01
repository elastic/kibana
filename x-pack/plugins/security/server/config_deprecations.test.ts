/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';

import { configDeprecationsMock } from '../../../../src/core/server/mocks';
import { securityConfigDeprecationProvider } from './config_deprecations';

const deprecationContext = configDeprecationsMock.createContext();

const applyConfigDeprecations = (settings: Record<string, any> = {}) => {
  const deprecations = securityConfigDeprecationProvider(configDeprecationFactory);
  const generatedDeprecations: Array<{ message: string; level?: 'warning' | 'critical' }> = [];
  const configPaths: string[] = [];
  const { config: migrated } = applyDeprecations(
    settings,
    deprecations.map((deprecation) => ({
      deprecation,
      path: 'xpack.security',
      context: deprecationContext,
    })),
    () =>
      ({ message, level, configPath }) => {
        generatedDeprecations.push({ message, level });
        configPaths.push(configPath);
      }
  );
  return {
    deprecations: generatedDeprecations,
    configPaths,
    migrated,
  };
};

describe('Config Deprecations', () => {
  it('does not report any deprecations if session timeouts are specified', () => {
    const defaultConfig = { xpack: { security: { session: { idleTimeout: 123, lifespan: 345 } } } };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(defaultConfig));
    expect(migrated).toEqual(defaultConfig);
    expect(deprecations).toHaveLength(0);
  });

  it('reports that session idleTimeout and lifespan will have default values if none of them is specified', () => {
    const defaultConfig = { xpack: { security: {} } };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(defaultConfig));
    expect(migrated).toEqual(defaultConfig);
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "User sessions will automatically time out after 8 hours of inactivity starting in 8.0. Override this value to change the timeout.",
        },
        Object {
          "level": "warning",
          "message": "Users are automatically required to log in again after 30 days starting in 8.0. Override this value to change the timeout.",
        },
      ]
    `);
  });

  it('reports that session idleTimeout will have a default value if it is not specified', () => {
    const defaultConfig = { xpack: { security: { session: { lifespan: 345 } } } };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(defaultConfig));
    expect(migrated).toEqual(defaultConfig);
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "User sessions will automatically time out after 8 hours of inactivity starting in 8.0. Override this value to change the timeout.",
        },
      ]
    `);
  });

  it('reports that session lifespan will have a default value if it is not specified', () => {
    const defaultConfig = { xpack: { security: { session: { idleTimeout: 123 } } } };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(defaultConfig));
    expect(migrated).toEqual(defaultConfig);
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "Users are automatically required to log in again after 30 days starting in 8.0. Override this value to change the timeout.",
        },
      ]
    `);
  });

  it('renames sessionTimeout to session.idleTimeout', () => {
    const config = {
      xpack: {
        security: {
          sessionTimeout: 123,
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.sessionTimeout).not.toBeDefined();
    expect(migrated.xpack.security.session.idleTimeout).toEqual(123);
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "Setting \\"xpack.security.sessionTimeout\\" has been replaced by \\"xpack.security.session.idleTimeout\\"",
        },
        Object {
          "level": "warning",
          "message": "Users are automatically required to log in again after 30 days starting in 8.0. Override this value to change the timeout.",
        },
      ]
    `);
  });

  it('renames audit.appender.kind to audit.appender.type', () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          audit: {
            appender: {
              kind: 'console',
            },
          },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.audit.appender.kind).not.toBeDefined();
    expect(migrated.xpack.security.audit.appender.type).toEqual('console');
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "Setting \\"xpack.security.audit.appender.kind\\" has been replaced by \\"xpack.security.audit.appender.type\\"",
        },
      ]
    `);
  });

  it('renames audit.appender.layout.kind to audit.appender.layout.type', () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          audit: {
            appender: {
              layout: { kind: 'pattern' },
            },
          },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.audit.appender.layout.kind).not.toBeDefined();
    expect(migrated.xpack.security.audit.appender.layout.type).toEqual('pattern');
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "Setting \\"xpack.security.audit.appender.layout.kind\\" has been replaced by \\"xpack.security.audit.appender.layout.type\\"",
        },
      ]
    `);
  });

  it('renames audit.appender.policy.kind to audit.appender.policy.type', () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          audit: {
            appender: {
              policy: { kind: 'time-interval' },
            },
          },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.audit.appender.policy.kind).not.toBeDefined();
    expect(migrated.xpack.security.audit.appender.policy.type).toEqual('time-interval');
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "Setting \\"xpack.security.audit.appender.policy.kind\\" has been replaced by \\"xpack.security.audit.appender.policy.type\\"",
        },
      ]
    `);
  });

  it('renames audit.appender.strategy.kind to audit.appender.strategy.type', () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          audit: {
            appender: {
              strategy: { kind: 'numeric' },
            },
          },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.audit.appender.strategy.kind).not.toBeDefined();
    expect(migrated.xpack.security.audit.appender.strategy.type).toEqual('numeric');
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "Setting \\"xpack.security.audit.appender.strategy.kind\\" has been replaced by \\"xpack.security.audit.appender.strategy.type\\"",
        },
      ]
    `);
  });

  it('renames audit.appender.path to audit.appender.fileName', () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          audit: {
            appender: {
              type: 'file',
              path: './audit.log',
            },
          },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.audit.appender.path).not.toBeDefined();
    expect(migrated.xpack.security.audit.appender.fileName).toEqual('./audit.log');
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "Setting \\"xpack.security.audit.appender.path\\" has been replaced by \\"xpack.security.audit.appender.fileName\\"",
        },
      ]
    `);
  });

  it('renames security.showInsecureClusterWarning to xpack.security.showInsecureClusterWarning', () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
        },
      },
      security: {
        showInsecureClusterWarning: false,
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.security.showInsecureClusterWarning).not.toBeDefined();
    expect(migrated.xpack.security.showInsecureClusterWarning).toEqual(false);
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "Setting \\"security.showInsecureClusterWarning\\" has been replaced by \\"xpack.security.showInsecureClusterWarning\\"",
        },
      ]
    `);
  });

  it('warns when using the legacy audit logger on-prem', () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          audit: {
            enabled: true,
          },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.audit.appender).not.toBeDefined();
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "Use the new ECS-compliant audit logger.",
        },
      ]
    `);
  });

  it('does not warn when using the ECS audit logger on-prem', () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          audit: {
            enabled: true,
            appender: {
              type: 'file',
              fileName: './audit.log',
            },
          },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated).toEqual(config);
    expect(deprecations).toHaveLength(0);
  });

  it('warns when using the legacy audit logger on cloud', () => {
    const config = {
      xpack: {
        cloud: {
          id: 'abc123',
        },
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          audit: {
            enabled: true,
          },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.audit.appender).not.toBeDefined();
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "Use the new ECS-compliant audit logger.",
        },
      ]
    `);
  });

  it('does not warn when using the ECS audit logger on cloud', () => {
    const config = {
      xpack: {
        cloud: {
          id: 'abc123',
        },
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          audit: {
            enabled: true,
            appender: {
              type: 'file',
              fileName: './audit.log',
            },
          },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated).toEqual(config);
    expect(deprecations).toHaveLength(0);
  });

  it('does not warn about using the legacy logger when using the ECS audit logger, even when using the deprecated ECS appender config', () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          audit: {
            enabled: true,
            appender: {
              type: 'file',
              path: './audit.log',
            },
          },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack.security.audit.appender.path).not.toBeDefined();
    expect(migrated.xpack.security.audit.appender.fileName).toEqual('./audit.log');
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "Setting \\"xpack.security.audit.appender.path\\" has been replaced by \\"xpack.security.audit.appender.fileName\\"",
        },
      ]
    `);
  });

  it(`warns that 'authorization.legacyFallback.enabled' is unused`, () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          authorization: {
            legacyFallback: {
              enabled: true,
            },
          },
        },
      },
    };
    const { deprecations } = applyConfigDeprecations(cloneDeep(config));
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "You no longer need to configure \\"xpack.security.authorization.legacyFallback.enabled\\".",
        },
      ]
    `);
  });

  it(`warns that 'authc.saml.maxRedirectURLSize is unused`, () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          authc: {
            saml: {
              maxRedirectURLSize: 123,
            },
          },
        },
      },
    };
    const { deprecations } = applyConfigDeprecations(cloneDeep(config));
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "You no longer need to configure \\"xpack.security.authc.saml.maxRedirectURLSize\\".",
        },
      ]
    `);
  });

  it(`warns that 'xpack.security.authc.providers.saml.<provider-name>.maxRedirectURLSize' is unused`, () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
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
    const { deprecations, configPaths } = applyConfigDeprecations(cloneDeep(config));
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "This setting is no longer used.",
        },
      ]
    `);

    expect(configPaths).toEqual(['xpack.security.authc.providers.saml.saml1.maxRedirectURLSize']);
  });

  it(`warns when 'xpack.security.authc.providers' is an array of strings`, () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          authc: {
            providers: ['basic', 'saml'],
          },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated).toEqual(config);
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "Use the new object format instead of an array of provider types.",
        },
      ]
    `);
  });

  it(`warns when both the basic and token providers are enabled`, () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
          authc: {
            providers: ['basic', 'token'],
          },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated).toEqual(config);
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "warning",
          "message": "Use the new object format instead of an array of provider types.",
        },
        Object {
          "level": "warning",
          "message": "Use only one of these providers. When both providers are set, Kibana only uses the \\"token\\" provider.",
        },
      ]
    `);
  });

  it('warns when the security plugin is disabled', () => {
    const config = {
      xpack: {
        security: {
          enabled: false,
          session: { idleTimeout: 123, lifespan: 345 },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated).toEqual(config);
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "critical",
          "message": "Enabling or disabling the Security plugin in Kibana is deprecated. Configure security in Elasticsearch instead.",
        },
      ]
    `);
  });

  it('warns when the security plugin is enabled', () => {
    const config = {
      xpack: {
        security: {
          enabled: true,
          session: { idleTimeout: 123, lifespan: 345 },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated).toEqual(config);
    expect(deprecations).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "critical",
          "message": "Enabling or disabling the Security plugin in Kibana is deprecated. Configure security in Elasticsearch instead.",
        },
      ]
    `);
  });

  it("does not warn when xpack.security.enabled isn't set", () => {
    const config = {
      xpack: {
        security: {
          session: { idleTimeout: 123, lifespan: 345 },
        },
      },
    };
    const { deprecations, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated).toEqual(config);
    expect(deprecations).toHaveLength(0);
  });
});
