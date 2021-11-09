/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';

import { configDeprecationsMock } from '../../../../src/core/server/mocks';

import { config } from '.';

const deprecationContext = configDeprecationsMock.createContext();

const applyConfigDeprecations = (settings: Record<string, any> = {}) => {
  if (!config.deprecations) {
    throw new Error('Config is not valid no deprecations');
  }
  const deprecations = config.deprecations(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const migrated = applyDeprecations(
    settings,
    deprecations.map((deprecation) => ({
      deprecation,
      path: '',
      context: deprecationContext,
    })),
    () =>
      ({ message }) =>
        deprecationMessages.push(message)
  );
  return {
    messages: deprecationMessages,
    migrated: migrated.config,
  };
};

describe('Config depreciation test', () => {
  it('should migrate old xpack.ingestManager.fleet settings to xpack.fleet.agents', () => {
    const { migrated } = applyConfigDeprecations({
      xpack: {
        ingestManager: {
          fleet: { enabled: true, elasticsearch: { host: 'http://testes.fr:9200' } },
        },
      },
    });

    expect(migrated).toMatchInlineSnapshot(`
      Object {
        "xpack": Object {
          "fleet": Object {
            "agents": Object {
              "elasticsearch": Object {
                "hosts": Array [
                  "http://testes.fr:9200",
                ],
              },
              "enabled": true,
            },
          },
        },
      }
    `);
  });

  it('should support mixing xpack.ingestManager config and xpack.fleet config', () => {
    const { migrated } = applyConfigDeprecations({
      xpack: {
        ingestManager: { registryUrl: 'http://registrytest.fr' },
        fleet: { registryProxyUrl: 'http://registryProxy.fr' },
      },
    });

    expect(migrated).toMatchInlineSnapshot(`
      Object {
        "xpack": Object {
          "fleet": Object {
            "registryProxyUrl": "http://registryProxy.fr",
            "registryUrl": "http://registrytest.fr",
          },
        },
      }
    `);
  });
});
