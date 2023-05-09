/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core-http-server';
import type { Patch } from '../../common/types';
import { STATE_PATCH_API_PATH } from '../../common/constants';

const patches: Record<string, Array<{ patch: Patch; sessionsReceived: Set<string> }>> = {};

export async function statePatches(router: IRouter) {
  router.post(
    {
      path: STATE_PATCH_API_PATH,
      validate: {
        body: schema.object({
          visId: schema.string(),
          sessionId: schema.string(),
          patch: schema.arrayOf(schema.any()),
        }),
      },
    },
    async (context, req, res) => {
      const patch: Patch = req.body.patch;
      if (!patches[req.body.visId]) {
        patches[req.body.visId] = [];
      }

      patches[req.body.visId].push({ patch, sessionsReceived: new Set([req.body.sessionId]) });

      return res.ok();
    }
  );

  router.get(
    {
      path: STATE_PATCH_API_PATH,
      validate: {
        query: schema.object({
          visId: schema.string(),
          sessionId: schema.string(),
        }),
      },
    },
    async (context, req, res) => {
      const patchesToReturn = patches[req.query.visId]
        ? patches[req.query.visId]
            .filter(({ sessionsReceived }) => {
              if (!sessionsReceived.has(req.query.sessionId)) {
                sessionsReceived.add(req.query.sessionId);
                return true;
              }

              return false;
            })
            .map(({ patch }) => patch)
        : [];

      return res.ok({
        body: { patches: patchesToReturn },
      });
    }
  );
}
