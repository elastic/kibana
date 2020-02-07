/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter, RequestHandler } from 'kibana/server';
import { PLUGIN_ID, INSTALL_SCRIPT_API_ROUTES } from '../../constants';
import { getScript } from '../../services/install_script';

export const registerRoutes = (router: IRouter) => {
  router.get(
    {
      path: INSTALL_SCRIPT_API_ROUTES,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getInstallScriptHandler
  );
};

const getInstallScriptHandler: RequestHandler<{ osType: 'macos' }> = async (
  context,
  request,
  response
) => {
  const script = getScript(request.params.osType);

  return response.ok({ body: script });
};
