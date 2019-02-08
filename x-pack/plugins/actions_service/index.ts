/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import mappings from './mappings.json';
// import './types.d';

export const actionsService = (kibana: any) => {
  return new kibana.Plugin({
    id: 'actions_service',
    require: ['kibana', 'elasticsearch', 'xpack_main', 'SecretService'],
    configPrefix: 'xpack.actions_service',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      mappings,
      savedObjectSchemas: {
        actionConfiguration: {},
      },
      app: {
        title: 'Actions manager',
        description: 'An awesome actions manager',
        main: 'plugins/actions_service/app',
      },
      styleSheetPaths: require('path').resolve(__dirname, 'public/app.scss'),
    },

    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        secret: Joi.string().default(undefined),
      }).default();
    },

    init(server: any) {
      const registrar: ActionHandler[] = [];
      const instances: ActionInstance[] = [];
      const info = (message: string) => server.log(['actions_service', 'info'], message);
      const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
      const so = server.savedObjects.getSavedObjectsRepository(callWithInternalUser);

      const loadActionConfigurations = async () => {
        const results = await so.find({ type: 'actionConfiguration' });
        info('Search results have been returned');
        results.saved_objects.forEach((config: any) => {
          info(`We found a action configuration ${config.id}`);
        });
      };

      const register = (actionDef: ActionHandler) => {
        registrar.push(actionDef);
      };

      const instance = async (instDef: ActionInstance) => {
        const saved = await so.create('actionConfiguration', instDef);
        if (!saved) {
          info(`Trouble saving the Action instance ${instDef}`);
        }
        instances.push(instDef);
      };

      server.expose('actions', {
        register,
        instance,
      });

      instance({
        initParams: [{ name: 'username', type: 'string' }, { name: 'password', type: 'secret' }],
      });

      loadActionConfigurations().then(() => {
        info('Action configurations loaded');
      });

      this.kbnServer.afterPluginsInit(() => {
        info('All done waiting for dependencies to define action handlers');
      });
    },
  });
};
