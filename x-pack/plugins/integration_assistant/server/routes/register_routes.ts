/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import fs from 'fs';
import nunjucks from 'nunjucks';
import { resolve as resolvePath } from 'path';
import { registerEcsRoutes } from './ecs_routes';
import { registerIntegrationBuilderRoutes } from './build_integration_routes';
import { registerCategorizationRoutes } from './categorization_routes';
import { registerRelatedRoutes } from './related_routes';
import { registerPipelineRoutes } from './pipeline_routes';
import type { IntegrationAssistantRouteHandlerContext } from '../plugin';

export function registerRoutes(router: IRouter<IntegrationAssistantRouteHandlerContext>) {
  registerEcsRoutes(router);
  registerIntegrationBuilderRoutes(router);
  registerCategorizationRoutes(router);
  registerRelatedRoutes(router);
  registerPipelineRoutes(router);

  router.versioned
    .get({
      path: '/api/integration_assistant/test',
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.any(),
          },
        },
      },
      async (context, req, res) => {
        let body: Record<string, unknown> = {};
        try {
          const templateDir = resolvePath(__dirname, '../templates');
          const templateFile = resolvePath(templateDir, 'readme.md.njk');
          body = {
            templateDir: { path: templateFile, content: fs.readFileSync(templateFile).toString() },
          };

          nunjucks.configure([templateDir], {
            autoescape: false,
          });

          const readmeTemplate = nunjucks.render('readme.md.njk', {
            package_name: 'testPackageName',
            data_streams: ['testDataStreamName'],
          });

          body.readme = readmeTemplate;

          return res.ok({ body });
        } catch (error) {
          body.error = error.toString();
          return res.customError({ statusCode: 400, body: JSON.stringify(body) });
        }
      }
    );
}
