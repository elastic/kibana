/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from 'src/core/server';
import { EndpointAppContext } from '../../types';

/**
 * Registers the Host-(un-)isolation routes
 */
export function registerHostIsolationRoutes(router: IRouter, endpointContext: EndpointAppContext) {
  // perform isolation
  router.post(
    {
      path: `/api/endpoint/isolate`,
      validate: {
        body: schema.object({
          agent_ids: schema.nullable(schema.arrayOf(schema.string())),
          endpoint_ids: schema.nullable(schema.arrayOf(schema.string())),
          alert_ids: schema.nullable(schema.arrayOf(schema.string())),
          case_ids: schema.nullable(schema.arrayOf(schema.string())),
          comment: schema.nullable(schema.string()),
        }),
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      if (
        (req.body.agent_ids === null || req.body.agent_ids.length === 0) &&
        (req.body.endpoint_ids === null || req.body.endpoint_ids.length === 0)
      ) {
        return res.badRequest({
          body: {
            message: 'At least one agent ID or endpoint ID is required',
          },
        });
      }

      return res.ok({
        body: {
          action: '713085d6-ab45-4e9e-b41d-96563cafdd97',
        },
      });
    }
  );

  // perform UN-isolate
  router.post(
    {
      path: `/api/endpoint/unisolate`,
      validate: {
        body: schema.object({
          agent_ids: schema.nullable(schema.arrayOf(schema.string())),
          endpoint_ids: schema.nullable(schema.arrayOf(schema.string())),
          alert_ids: schema.nullable(schema.arrayOf(schema.string())),
          case_ids: schema.nullable(schema.arrayOf(schema.string())),
          comment: schema.nullable(schema.string()),
        }),
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      if (
        (req.body.agent_ids === null || req.body.agent_ids.length === 0) &&
        (req.body.endpoint_ids === null || req.body.endpoint_ids.length === 0)
      ) {
        return res.badRequest({
          body: {
            message: 'At least one agent ID or endpoint ID is required',
          },
        });
      }
      return res.ok({
        body: {
          action: '53ba1dd1-58a7-407e-b2a9-6843d9980068',
        },
      });
    }
  );
}
