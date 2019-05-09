/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

const defaultConfig = {
  'kibana.index': '.kibana',
};

interface PluginProperties extends Hapi.PluginProperties {
  actions: {
    create: jest.Mock;
    get: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
    update: jest.Mock;
    fire: jest.Mock;
    registerType: jest.Mock;
    listTypes: jest.Mock;
  };
}

interface MockServer extends Hapi.Server {
  plugins: PluginProperties;
}

export function createMockServer(config: Record<string, any> = defaultConfig): MockServer {
  const server = new Hapi.Server({
    port: 0,
  });

  server.config = () => {
    return {
      get(key: string) {
        return config[key];
      },
      has(key: string) {
        return config.hasOwnProperty(key);
      },
    };
  };

  server.register({
    name: 'actions',
    register(pluginServer: Hapi.Server) {
      pluginServer.expose('create', jest.fn());
      pluginServer.expose('get', jest.fn());
      pluginServer.expose('find', jest.fn());
      pluginServer.expose('delete', jest.fn());
      pluginServer.expose('update', jest.fn());
      pluginServer.expose('fire', jest.fn());
      pluginServer.expose('registerType', jest.fn());
      pluginServer.expose('listTypes', jest.fn());
    },
  });

  server.ext('onRequest', (request, h) => {
    const client = {
      errors: {} as any,
      bulkCreate: jest.fn(),
      bulkGet: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
    };
    request.getSavedObjectsClient = () => client;
    return h.continue;
  });

  // @ts-ignore
  return server;
}
