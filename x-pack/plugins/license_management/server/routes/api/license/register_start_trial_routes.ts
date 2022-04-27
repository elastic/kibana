/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canStartTrial, startTrial } from '../../../lib/start_trial';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../helpers';

export function registerStartTrialRoutes({
  router,
  lib: { handleEsError },
  plugins: { licensing },
}: RouteDependencies) {
  router.get({ path: addBasePath('/start_trial'), validate: false }, async (ctx, req, res) => {
    const { client } = (await ctx.core).elasticsearch;
    try {
      return res.ok({ body: await canStartTrial(client) });
    } catch (error) {
      return handleEsError({ error, response: res });
    }
  });

  router.post({ path: addBasePath('/start_trial'), validate: false }, async (ctx, req, res) => {
    const { client } = (await ctx.core).elasticsearch;
    try {
      return res.ok({
        body: await startTrial({ client, licensing }),
      });
    } catch (error) {
      return handleEsError({ error, response: res });
    }
  });
}
