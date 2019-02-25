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
    require: ['kibana', 'elasticsearch', 'xpack_main'],
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
      const registrar: Map<string, ActionType> = new Map();
      const connectors: Map<string, ActionConnector> = new Map();
      const info = (message: string) => server.log(['actions_service', 'info'], message);
      const warn = (message: string) => server.log(['actions_service', 'warning'], message);
      const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
      const so = server.savedObjects.getSavedObjectsRepository(callWithInternalUser);

      const registerActionType = (actionDef: ActionType) => {
        if (!registrar.has(actionDef.name)) {
          registrar.set(actionDef.name, actionDef);
        }
      };

      const registerConnector = (connectorDef: ActionConnector) => {
        const connectorName = `${connectorDef.actionType}:${connectorDef.connectorType}`;
        if (!connectors.has(connectorName)) {
          info(`Registering connector ${connectorName}`);
          connectors.set(connectorName, connectorDef);
        }
      };

      const instance = async <T>(instDef: ActionInstance<T>) => {
        const { name, actionType, connectorType, params, connectorParams } = instDef;
        const saved = await so.create(
          'actionConfiguration',
          {
            name,
            actionType,
            connectorType,
            instanceParams: JSON.stringify({ params, connectorParams }),
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

          const { connectorType, instanceParams } = response.attributes;
          const connector = connectors.get(`${actionType}:${connectorType}`);

          if (connector) {
            try {
              info(`Trying to execute connector ${connectorType}`);
              const instanceParamObj = JSON.parse(instanceParams);
              await connector.handler({
                params: {
                  ...params,
                  ...instanceParamObj.params,
                },
                connectorParams: instanceParamObj.connectorParams,
              });
            } catch (e) {
              warn(`[${connectorType}] failed with message ${e.message}`);
            }
          } else {
            info(
              `Could not execute action ${action} due to missing connector ${connectorType} in ${JSON.stringify(
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
        registerConnector,
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

      registerConnector({
        actionType: 'send message',
        connectorType: 'slack',
        async handler({ params, connectorParams }) {
          try {
            const body = JSON.stringify({
              ...connectorParams,
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
        connectorType: 'slack',
        params: {
          destination: '<example slack url>',
        },
        connectorParams: {
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
        path: '/api/actions/connectors',
        method: 'GET',
        handler() {
          return [...connectors.values()].map(connector => JSON.stringify(connector));
        },
      });

      this.kbnServer.afterPluginsInit(() => {
        info('All done waiting for dependencies to define action handlers');
      });
    },
  });
};
