/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import url from 'url';
import { IRouter, BasePath, HttpServerInfo, KibanaRequest } from 'kibana/server';
import { INSTALL_SCRIPT_API_ROUTES } from '../../constants';
import { getScript } from '../../services/install_script';
import { InstallScriptRequestSchema } from '../../types';

export const registerRoutes = ({
  router,
  basePath,
  serverInfo,
}: {
  router: IRouter;
  basePath: Pick<BasePath, 'serverBasePath'>;
  serverInfo: HttpServerInfo;
}) => {
  const kibanaUrl = url.format({
    protocol: serverInfo.protocol,
    hostname: serverInfo.host,
    port: serverInfo.port,
    pathname: basePath.serverBasePath,
  });

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
      const script = getScript(request.params.osType, kibanaUrl);

      return response.ok({ body: script });
    }
  );
};
