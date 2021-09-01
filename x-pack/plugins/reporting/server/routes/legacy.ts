/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import querystring from 'querystring';
import { authorizedUserPreRouting } from './lib/authorized_user_pre_routing';
import { API_BASE_URL } from '../../common/constants';
import { HandlerErrorFunction, HandlerFunction } from './types';
import { ReportingCore } from '../core';
import { LevelLogger } from '../lib';

const BASE_GENERATE = `${API_BASE_URL}/generate`;

export function registerLegacy(
  reporting: ReportingCore,
  handler: HandlerFunction,
  handleError: HandlerErrorFunction,
  logger: LevelLogger
) {
  const { router } = reporting.getPluginSetupDeps();

  function createLegacyPdfRoute({ path, objectType }: { path: string; objectType: string }) {
    const exportTypeId = 'printablePdf';

    router.post(
      {
        path,
        validate: {
          params: schema.object({
            savedObjectId: schema.string({ minLength: 3 }),
          }),
          query: schema.any(),
        },
      },

      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        const message = `The following URL is deprecated and will stop working in the next major version: ${req.url.pathname}${req.url.search}`;
        logger.warn(message, ['deprecation']);

        try {
          const {
            title,
            savedObjectId,
            browserTimezone,
          }: { title: string; savedObjectId: string; browserTimezone: string } = req.params as any;
          const queryString = querystring.stringify(req.query as any);

          return await handler(
            user,
            exportTypeId,
            {
              title,
              objectType,
              savedObjectId,
              browserTimezone,
              queryString,
              version: reporting.getKibanaVersion(),
            },
            context,
            req,
            res
          );
        } catch (err) {
          throw handleError(res, err);
        }
      })
    );
  }

  createLegacyPdfRoute({
    path: `${BASE_GENERATE}/visualization/{savedId}`,
    objectType: 'visualization',
  });

  createLegacyPdfRoute({
    path: `${BASE_GENERATE}/search/{savedId}`,
    objectType: 'search',
  });

  createLegacyPdfRoute({
    path: `${BASE_GENERATE}/dashboard/{savedId}`,
    objectType: 'dashboard',
  });
}
