/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { ActionService } from '../action_service';
import { AlertService } from '../alert_service';
import { ConnectorService } from '../connector_service';
import { APP_ID } from '../../common/constants';
import { WithoutQueryAndParams, SavedObjectReference } from './types';

interface Server extends Hapi.Server {
  alerting: () => {
    actions: ActionService;
    alerts: AlertService;
    connectors: ConnectorService;
  };
}

interface CreateActionRequest extends WithoutQueryAndParams<Hapi.Request> {
  server: Server;
  query: {
    overwrite: boolean;
  };
  params: {
    id?: string;
  };
  payload: {
    attributes: {
      description: string;
      connectorId: string;
      connectorOptions: { [key: string]: any };
    };
    migrationVersion?: { [key: string]: string };
    references: SavedObjectReference[];
  };
}

export function createActionRoute(server: Hapi.Server) {
  server.route({
    method: 'POST',
    path: `/api/${APP_ID}/action/{id?}`,
    options: {
      validate: {
        query: Joi.object()
          .keys({
            overwrite: Joi.boolean().default(false),
          })
          .default(),
        params: Joi.object()
          .keys({
            id: Joi.string(),
          })
          .required(),
        payload: Joi.object().keys({
          attributes: Joi.object()
            .keys({
              description: Joi.string().required(),
              connectorId: Joi.string().required(),
              connectorOptions: Joi.object(),
            })
            .required(),
          migrationVersion: Joi.object().optional(),
          references: Joi.array()
            .items(
              Joi.object().keys({
                name: Joi.string().required(),
                type: Joi.string().required(),
                id: Joi.string().required(),
              })
            )
            .default([]),
        }),
      },
    },
    async handler(request: CreateActionRequest) {
      const savedObjectsClient = request.getSavedObjectsClient();
      return await request.server
        .alerting()
        .actions.create(savedObjectsClient, request.payload.attributes, {
          id: request.params.id,
          overwrite: request.query.overwrite,
        });
    },
  });
}
