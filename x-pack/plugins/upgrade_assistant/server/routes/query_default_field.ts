/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@commercial/boom';
import Joi from 'joi';
import { Legacy } from 'kibana';
import _ from 'lodash';

import { EsVersionPrecheck } from '../lib/es_version_precheck';
import { addDefaultField } from '../lib/query_default_field';

/**
 * Adds routes for detecting and fixing 6.x Metricbeat indices that need the
 * `index.query.default_field` index setting added.
 *
 * @param server
 */
export function registerQueryDefaultFieldRoutes(server: Legacy.Server) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');

  server.route({
    path: '/api/upgrade_assistant/add_query_default_field/{indexName}',
    method: 'POST',
    options: {
      pre: [EsVersionPrecheck],
      validate: {
        params: Joi.object({
          indexName: Joi.string().required(),
        }),
        payload: Joi.object({
          fieldTypes: Joi.array()
            .items(Joi.string())
            .required(),
          otherFields: Joi.array().items(Joi.string()),
        }),
      },
    },
    async handler(request) {
      try {
        const { indexName } = request.params;
        const { fieldTypes, otherFields } = request.payload as {
          fieldTypes: string[];
          otherFields?: string[];
        };

        return await addDefaultField(
          callWithRequest,
          request,
          indexName,
          new Set(fieldTypes),
          otherFields ? new Set(otherFields) : undefined
        );
      } catch (e) {
        if (e.status === 403) {
          return Boom.forbidden(e.message);
        }

        return Boom.boomify(e, {
          statusCode: 500,
        });
      }
    },
  });
}
