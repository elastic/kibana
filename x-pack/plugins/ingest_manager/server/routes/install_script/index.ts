/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import url from 'url';
import { IRouter, BasePath, KibanaRequest } from 'src/core/server';
import { INSTALL_SCRIPT_API_ROUTES } from '../../constants';
import { getScript } from '../../services/install_script';
import { InstallScriptRequestSchema } from '../../types';
import { appContextService, settingsService } from '../../services';

function getInternalUserSOClient(request: KibanaRequest) {
  // soClient as kibana internal users, be carefull on how you use it, security is not enabled
  return appContextService.getSavedObjects().getScopedClient(request, {
    excludedWrappers: ['security'],
  });
}

export const registerRoutes = ({
  router,
}: {
  router: IRouter;
  basePath: Pick<BasePath, 'serverBasePath'>;
}) => {
  router.get(
    {
      path: INSTALL_SCRIPT_API_ROUTES,
      validate: InstallScriptRequestSchema,
      options: { tags: [], authRequired: false },
    },
    async function getInstallScriptHandler(
      context,
      request: KibanaRequest<{ osType: 'macos' }>,
      response
    ) {
      const soClient = getInternalUserSOClient(request);
      const http = appContextService.getHttpSetup();
      const serverInfo = http.getServerInfo();
      const basePath = http.basePath;
      const kibanaUrl =
        (await settingsService.getSettings(soClient)).kibana_url ||
        url.format({
          protocol: serverInfo.protocol,
          hostname: serverInfo.hostname,
          port: serverInfo.port,
          pathname: basePath.serverBasePath,
        });

      const script = getScript(request.params.osType, kibanaUrl);

      return response.ok({ body: script });
    }
  );
};
