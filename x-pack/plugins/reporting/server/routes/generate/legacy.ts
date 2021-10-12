/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import querystring, { ParsedUrlQueryInput } from 'querystring';
import { API_BASE_URL } from '../../../common/constants';
import { ReportingCore } from '../../core';
import { LevelLogger } from '../../lib';
import { authorizedUserPreRouting } from '../lib/authorized_user_pre_routing';
import { RequestHandler } from '../lib/request_handler';

const BASE_GENERATE = `${API_BASE_URL}/generate`;

export function registerLegacy(reporting: ReportingCore, logger: LevelLogger) {
  const { router } = reporting.getPluginSetupDeps();

  function createLegacyPdfRoute({ path, objectType }: { path: string; objectType: string }) {
    const exportTypeId = 'printablePdf';

    router.post(
      {
        path,
        validate: {
          params: schema.object({
            savedObjectId: schema.string({ minLength: 3 }),
            title: schema.string(),
            browserTimezone: schema.string(),
          }),
          query: schema.maybe(schema.string()),
        },
      },

      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        const requestHandler = new RequestHandler(reporting, user, context, req, res, logger);
        const message = `The following URL is deprecated and will stop working in the next major version: ${req.url.pathname}${req.url.search}`;
        logger.warn(message, ['deprecation']);

        try {
          const {
            title,
            savedObjectId,
            browserTimezone,
          }: { title: string; savedObjectId: string; browserTimezone: string } = req.params;
          const queryString = querystring.stringify(req.query as ParsedUrlQueryInput | undefined);

          return await requestHandler.handleGenerateRequest(exportTypeId, {
            title,
            objectType,
            savedObjectId,
            browserTimezone,
            queryString,
            version: reporting.getKibanaVersion(),
          });
        } catch (err) {
          throw requestHandler.handleError(err);
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
