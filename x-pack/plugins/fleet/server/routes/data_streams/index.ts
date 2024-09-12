/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS } from '../../../common/constants';

import { DATA_STREAM_API_ROUTES } from '../../constants';

import { genericErrorResponse } from '../schema/errors';

import { getListHandler } from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // List of data streams
  router.versioned
    .get({
      path: DATA_STREAM_API_ROUTES.LIST_PATTERN,
      fleetAuthz: {
        fleet: { all: true },
      },
      description: `List data streams`,
      options: {
        tags: ['oas_tag:Data streams'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
          response: {
            200: {
              body: () =>
                schema.object({
                  data_streams: schema.arrayOf(
                    schema.object({
                      index: schema.string(),
                      dataset: schema.string(),
                      namespace: schema.string(),
                      type: schema.string(),
                      package: schema.string(),
                      package_version: schema.string(),
                      last_activity_ms: schema.number(),
                      size_in_bytes: schema.number(),
                      size_in_bytes_formatted: schema.oneOf([schema.number(), schema.string()]),
                      dashboards: schema.arrayOf(
                        schema.object({
                          id: schema.string(),
                          title: schema.string(),
                        })
                      ),
                      serviceDetails: schema.nullable(
                        schema.object({
                          environment: schema.string(),
                          serviceName: schema.string(),
                        })
                      ),
                    })
                  ),
                }),
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getListHandler
    );
};
