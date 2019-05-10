/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

const defaultConfig = {
  'kibana.index': '.kibana',
};

export function createMockServer(config: Record<string, any> = defaultConfig) {
  const server = new Hapi.Server({
    port: 0,
  });

  const savedObjectsClient = {
    errors: {} as any,
    bulkCreate: jest.fn(),
    bulkGet: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  };

  const actionsClient = {
    create: jest.fn(),
    get: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    fire: jest.fn(),
  };

  const actionTypeService = {
    registerType: jest.fn(),
    listTypes: jest.fn(),
  };

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
      pluginServer.expose('registerType', actionTypeService.registerType);
      pluginServer.expose('listTypes', actionTypeService.listTypes);
    },
  });

  server.decorate('request', 'getSavedObjectsClient', () => savedObjectsClient);
  server.decorate('request', 'getActionsClient', () => actionsClient);

  return { server, savedObjectsClient, actionsClient, actionTypeService };
}
