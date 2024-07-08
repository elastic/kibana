/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '@kbn/core/server/mocks';

import { config } from './config';

const applyConfigDeprecations = (fleetSettings: Record<string, any> = {}) => {
  const deprecationContext = configDeprecationsMock.createContext();
  const deprecations = config.deprecations!(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const configPaths: string[] = [];
  const { config: migrated } = applyDeprecations(
    {
      xpack: {
        fleet: fleetSettings,
      },
    },
    deprecations.map((deprecation) => ({
      deprecation,
      path: 'xpack.fleet',
      context: deprecationContext,
    })),
    () =>
      ({ message, configPath }) => {
        deprecationMessages.push(message);
        configPaths.push(configPath);
      }
  );
  return {
    configPaths,
    messages: deprecationMessages,
    migrated,
  };
};

describe('Config schema', () => {
  it('should not allow to specify both default output in xpack.fleet.ouputs and xpack.fleet.agents.elasticsearch.hosts ', () => {
    expect(() => {
      config.schema.validate({
        agents: { elasticsearch: { hosts: ['https://elasticsearch:9200'] } },
        outputs: [
          {
            id: 'test',
            name: 'test output',
            type: 'elasticsearch',
            hosts: ['http://elasticsearch:9200'],
            is_default: true,
            is_default_monitoring: true,
          },
        ],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"xpack.fleet.agents.elasticsearch.hosts should not be used when defining default outputs in xpack.fleet.outputs, please remove it."`
    );
  });

  it('should allow to specify both outputs in xpack.fleet.ouputs without default outputs and xpack.fleet.agents.elasticsearch.hosts ', () => {
    expect(() => {
      config.schema.validate({
        agents: { elasticsearch: { hosts: ['https://elasticsearch:9200'] } },
        outputs: [
          {
            id: 'test',
            name: 'test output',
            type: 'elasticsearch',
            hosts: ['http://elasticsearch:9200'],
            is_default: false,
            is_default_monitoring: false,
          },
        ],
      });
    }).not.toThrow();
  });

  it('should allow to specify default outputs only xpack.fleet.ouputs ', () => {
    expect(() => {
      config.schema.validate({
        outputs: [
          {
            id: 'test',
            name: 'test output',
            type: 'elasticsearch',
            hosts: ['http://elasticsearch:9200'],
            is_default: true,
            is_default_monitoring: true,
          },
        ],
      });
    }).not.toThrow();
  });

  it('should allow to specify default output only in xpack.fleet.agents.elasticsearch.hosts ', () => {
    expect(() => {
      config.schema.validate({
        agents: { elasticsearch: { hosts: ['https://elasticsearch:9200'] } },
      });
    }).not.toThrow();
  });
  it('should not allow to specify a agentless.api.url in xpack.fleet.agentless.api without the tls config  ', () => {
    expect(() => {
      config.schema.validate({
        agentless: { api: { url: 'https://agentless.api.url' } },
      });
    }).toThrow();
  });

  it('should allow to specify agentless.api.url and the tls config in in xpack.fleet.agentless.api', () => {
    expect(() => {
      config.schema.validate({
        agentless: {
          api: {
            url: 'https://agentless.api.url',
            tls: {
              certificate: 'config/certs/agentless.crt',
              key: 'config/certs/agentless.key',
              ca: 'config/certs/ca.crt',
            },
          },
        },
      });
    }).not.toThrow();
  });

  describe('deprecations', () => {
    it('should add a depreciations when trying to enable a non existing experimental feature', () => {
      const res = applyConfigDeprecations({
        enableExperimental: ['notvalid'],
      });

      expect(res.messages).toMatchInlineSnapshot(`
        Array [
          "[notvalid] is not a valid fleet experimental feature [xpack.fleet.fleet.enableExperimental].",
        ]
      `);
    });

    it('should not add a depreciations when enabling an existing experimental feature', () => {
      const res = applyConfigDeprecations({
        enableExperimental: ['displayAgentMetrics'],
      });

      expect(res.messages).toMatchInlineSnapshot(`Array []`);
    });
  });
});
