/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash';
import fetch from 'node-fetch';
import { resolve } from 'path';
import url from 'url';
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
        'server-action': {},
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
      const registrar: Map<string, ActionType> = new Map();
      const handlers: Map<string, ActionHandler> = new Map();
      const info = (message: string) => server.log(['actions_service', 'info'], message);
      const warn = (message: string) => server.log(['actions_service', 'warning'], message);
      const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
      const so = server.savedObjects.getSavedObjectsRepository(callWithInternalUser);

      const registerActionType = (actionDef: ActionType) => {
        if (!registrar.has(actionDef.name)) {
          registrar.set(actionDef.name, actionDef);
        }
      };

      const registerHandler = (handlerDef: ActionHandler) => {
        const handlerName = `${handlerDef.actionType}:${handlerDef.handlerType}`;
        if (!handlers.has(handlerName)) {
          info(`Registering handler ${handlerName}`);
          handlers.set(handlerName, handlerDef);
        }
      };

      const instance = async <T>(instDef: ActionInstance<T>) => {
        const { name, actionType, handlerType, params, handlerParams } = instDef;
        const saved = await so.create(
          'actionConfiguration',
          {
            name,
            actionType,
            handlerType,
            instanceParams: JSON.stringify({ params, handlerParams }),
          },
          {
            id: `${actionType}:${name}`,
            overwrite: true,
          }
        );
        if (!saved) {
          warn(`Trouble saving the Action instance ${instDef}`);
        }
      };

      const fire = async (execution: ActionExecution) => {
        const { action, actionType, params } = execution;

        try {
          const response: any = await so.get('actionConfiguration', `${actionType}:${action}`);

          if (response === undefined) {
            warn(
              `Could not find any action instances to execute with name ${actionType}:${action}`
            );
            return;
          }

          const { handlerType, instanceParams } = response.attributes;
          const handler = handlers.get(`${actionType}:${handlerType}`);

          if (handler) {
            try {
              info(`Trying to execute handler ${handlerType}`);
              const instanceParamObj = JSON.parse(instanceParams);
              await handler.handler({
                params: {
                  ...params,
                  ...instanceParamObj.params,
                },
                handlerParams: instanceParamObj.handlerParams,
              });
            } catch (e) {
              warn(`[${handlerType}] failed with message ${e.message}`);
            }
          } else {
            info(
              `Could not execute action ${action} due to missing handler ${handlerType} in ${JSON.stringify(
                response
              )}`
            );
          }
        } catch (e) {
          info(`Bad Request to saved objects sevice ${e.message}`);
          return;
        }
      };

      server.expose('actions', {
        registerActionType,
        registerHandler,
        instance,
        fire,
      });

      registerActionType({
        name: 'send message',
        initParams: [{ name: 'username', type: 'string' }, { name: 'password', type: 'secret' }],
        executionParams: [
          { name: 'destination', type: 'string' },
          { name: 'message', type: 'string' },
          { name: 'title', type: 'string' },
        ],
      });

      registerHandler({
        actionType: 'send message',
        handlerType: 'slack',
        async handler({ params, handlerParams }) {
          try {
            const body = JSON.stringify({
              ...handlerParams,
              username: 'webhookbot',
              text: params.message,
              icon_emoji: ':ghost:',
            });
            const result = new url.URL(params.destination);
            await fetch(result.toString(), {
              method: 'POST',
              body,
            });
          } catch (e) {
            warn(`[slack] failed with ${e.message}`);
          }
        },
      });

      instance({
        name: 'send message to slack',
        actionType: 'send message',
        params: {
          destination: '<slack url>',
        },
        handler: 'slack',
        handlerParams: {
          channel: '#bot-playground',
        },
      });

      fire({
        action: 'send message to slack',
        actionType: 'send message',
        params: {
          message: 'This is a test message from kibana actions service',
          title: 'custom title',
        },
      });

      server.route({
        path: '/api/actions/handlers',
        method: 'GET',
        handler() {
          return [...handlers.values()].map(handler => JSON.stringify(handler));
        },
      });

      this.kbnServer.afterPluginsInit(() => {
        info('All done waiting for dependencies to define action handlers');
      });
    },
  });
};
