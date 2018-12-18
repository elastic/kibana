/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { SecretStore } from './server';

const existence = (object: any, type: string) => {
  return object ? `${type} object exists` : `${type} does not exist`;
};

export const secretstore = (kibana: any) => {
  return new kibana.Plugin({
    id: 'secretstore',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {},
    init(server: any) {
      server.expose('secretstore', new SecretStore());
      const warn = (message: string | any) => server.log(['secretstore', 'warning'], message);
      warn(existence(server.savedObjects, 'server.savedObjects'));
      server.savedObjects.addScopedSavedObjectsClientWrapperFactory(999, (args: any) => {
        const { client } = args;
        // warn('I am warning you this is bad');
        return {
          errors: client.errors,
          get: async (type: string, id: string, options: any = {}) => {
            warn(`get type:'${type}' and id:'${id}'`);
            return await client.get(type, id, options);
          },
          find: async (options: any = {}) => {
            warn(`find options:'${JSON.stringify(options)}'`);
            return await client.find(options);
          },
          bulkCreate: async (objects: any[], options: any = {}) => {
            warn(
              `bulkCreate objects:'${JSON.stringify(objects)}' and options:'${JSON.stringify(
                options
              )}'`
            );
            return await client.bulkCreate(objects, options);
          },
          bulkGet: async (objects: any[], options: any = {}) => {
            warn(
              `bulkGet objects:'${JSON.stringify(objects)}' and options:'${JSON.stringify(
                options
              )}'`
            );
            return await client.bulkGet(objects, options);
          },
          update: async (type: string, id: string, attributes: any, options: any = {}) => {
            warn(`update type:'${type}' and id:'${id}' and attrs:'${JSON.stringify(attributes)}'`);
            return await client.update(type, id, attributes, options);
          },
          create: async (type: string, attributes: any = {}, options: any = {}) => {
            warn(
              `create type:'${type}' and options:'${JSON.stringify(
                options
              )}' and attrs:'${JSON.stringify(attributes)}'`
            );
            return await client.create(type, attributes, options);
          },
          delete: async (type: string, id: string, options: any = {}) => {
            warn(`delete type:'${type}' and id:'${id}' and options:'${JSON.stringify(options)}'`);
            return await client.delete(type, id, options);
          },
        };
      });
    },
  });
};
