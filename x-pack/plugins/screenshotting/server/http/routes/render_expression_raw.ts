import { ScreenshottingCoreSetup } from "../../plugin";
import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { firstValueFrom } from 'rxjs';

interface Params {
  core: ScreenshottingCoreSetup;
  router: IRouter;
}

export const registerRenderExpressionRaw = ({core, router}: Params) => {
  router.post({
    path: '/api/screenshotting/render/expression/raw',
    options: {
      body: {
        parse: false,
      },
    },
    validate: {
      body: schema.any(),
    },
  }, async (context, request, response) => {
    const expression = Buffer.from(request.body as Uint8Array).toString();

    if (!expression || typeof expression !== 'string') {
      throw new Error('Unexpected request body.');
    }
    
    const [, , screenshotting] = await core.getStartServices();
    const capture = await firstValueFrom(screenshotting.getScreenshots({
      expression,
      format: 'png',
      request,
    }));

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
  });
};
