/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type { Hint } from '../../services/hints/types';

interface GetHintsResponse {
  hints: Hint[];
}
import type { GetHintsRequestSchema } from '../../types';
import { defaultIngestErrorHandler } from '../../errors';
import * as HintService from '../../services/hints';

export const getHintsHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetHintsRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  try {
    const body: GetHintsResponse = {
      hints: await HintService.getHints(esClient, {
        page: request.query.page,
        perPage: request.query.perPage,
        kuery: request.query.kuery,
      }),
    };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
