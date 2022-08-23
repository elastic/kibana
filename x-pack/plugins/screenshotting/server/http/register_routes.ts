import { ScreenshottingCoreSetup } from "../plugin";
import { schema } from '@kbn/config-schema';
import { firstValueFrom } from 'rxjs';

export interface RegisterRoutesParams {
  core: ScreenshottingCoreSetup;
}

export const registerRoutes = ({core}: RegisterRoutesParams) => {
  const router = core.http.createRouter();

  router.post({
    path: '/api/screenshotting/render/expression',
    validate: {
      body: schema.object(
        {
          expression: schema.string(),
        },
      ),
    },
  }, async (context, request, response) => {
    const { expression } = request.body;
    const [, screenshotting] = await core.getStartServices();
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
