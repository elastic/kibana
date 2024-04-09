import { IRouter } from '@kbn/core/server';

export function defineRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/kubernetes_observability/example',
      validate: false,
    },
    async (context, request, response) => {
      return response.ok({
        body: {
          time: new Date().toISOString(),
        },
      });
    }
  );
}
