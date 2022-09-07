/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { firstValueFrom } from 'rxjs';
import { ScreenshottingCoreSetup } from '../../plugin';

interface Params {
  core: ScreenshottingCoreSetup;
  router: IRouter;
}

export const registerRenderExpression = ({ core, router }: Params) => {
  router.post(
    {
      path: '/api/screenshotting/render/expression',
      validate: {
        body: schema.object({
          expression: schema.string(),
          input: schema.maybe(schema.any()),
          format: schema.string({
            defaultValue: 'png',
            validate: (value) => {
              const formats = ['png', 'pdf'];
              if (!formats.includes(value)) {
                return 'Invalid format. Valid values are: ' + formats.join(', ');
              }
            },
          }),
        }),
      },
    },
    async (context, request, response) => {
      const { expression, input } = request.body;
      const format = request.body.format as 'png' | 'pdf';
      const [, , screenshotting] = await core.getStartServices();
      const capture = await firstValueFrom(
        screenshotting.getScreenshots({
          expression,
          input,
          format,
          request,
        })
      );

      const result = capture.results[0];
      if (!result) throw new Error('No screenshot capture result.');

      const screenshot = result!.screenshots[0];
      if (!screenshot) throw new Error('No screenshot in results.');

      return response.ok({
        headers: {
          'Content-Type': 'image/png',
        },
        body: screenshot.data,
      });
    }
  );
};
