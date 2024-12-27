/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponse } from '@kbn/core-http-router-server-internal';
import type { Logger } from '@kbn/core/server';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import type { ReportingCore } from '../../..';
import { authorizedUserPreRouting } from '../../common';
import { RequestHandler } from '../../common/generate';

const { GENERATE_PREFIX } = INTERNAL_ROUTES;

export function registerGenerationRoutesInternal(reporting: ReportingCore, logger: Logger) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  const kibanaAccessControlTags = ['access:generateReport'];

  const registerInternalPostGenerationEndpoint = () => {
    const path = `${GENERATE_PREFIX}/{exportType}`;
    router.post(
      {
        path,
        validate: RequestHandler.getValidation(),
        options: { tags: kibanaAccessControlTags, access: 'internal' },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        try {
          const requestHandler = new RequestHandler(
            reporting,
            user,
            context,
            path,
            req,
            res,
            logger
          );
          const jobParams = requestHandler.getJobParams();
          return await requestHandler.handleGenerateRequest(req.params.exportType, jobParams);
        } catch (err) {
          if (err instanceof KibanaResponse) {
            return err;
          }
          throw err;
        }
      })
    );
  };

  registerInternalPostGenerationEndpoint();
}
