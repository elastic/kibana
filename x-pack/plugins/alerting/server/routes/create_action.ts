/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { APP_ID } from '../../common/constants';
import { WithoutQueryAndParams, SavedObjectReference, Server } from './types';

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
      actionTypeId: string;
      actionTypeConfig: { [key: string]: any };
    };
    migrationVersion?: { [key: string]: string };
    references: SavedObjectReference[];
  };
}

export function createActionRoute(server: Hapi.Server) {
  server.route({
    method: 'POST',
    path: `/api/${APP_ID}/action`,
    options: {
      validate: {
        payload: Joi.object().keys({
          attributes: Joi.object()
            .keys({
              description: Joi.string().required(),
              actionTypeId: Joi.string().required(),
              actionTypeConfig: Joi.object(),
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
        .actions.create(savedObjectsClient, request.payload.attributes);
    },
  });
}
