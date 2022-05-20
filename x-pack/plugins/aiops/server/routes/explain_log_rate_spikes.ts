/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';

import type { IRouter, Logger } from '@kbn/core/server';
import type { DataRequestHandlerContext, IEsSearchRequest } from '@kbn/data-plugin/server';

import {
  aiopsExplainLogRateSpikesSchema,
  addFieldsAction,
} from '../../common/api/explain_log_rate_spikes';
import { API_ENDPOINT } from '../../common/api';

import { streamFactory } from '../lib/stream_factory';

export const defineExplainLogRateSpikesRoute = (
  router: IRouter<DataRequestHandlerContext>,
  logger: Logger
) => {
  router.post(
    {
      path: API_ENDPOINT.EXPLAIN_LOG_RATE_SPIKES,
      validate: {
        body: aiopsExplainLogRateSpikesSchema,
      },
    },
    async (context, request, response) => {
      const index = request.body.index;

      const controller = new AbortController();

      let shouldStop = false;
      request.events.aborted$.subscribe(() => {
        shouldStop = true;
        controller.abort();
      });
      request.events.completed$.subscribe(() => {
        shouldStop = true;
        controller.abort();
      });

      const search = await context.search;
      const res = await firstValueFrom(
        search.search(
          {
            params: {
              index,
              body: { size: 1 },
            },
          } as IEsSearchRequest,
          { abortSignal: controller.signal }
        )
      );

      const doc = res.rawResponse.hits.hits.pop();
      const fields = Object.keys(doc?._source ?? {});

      const { end, push, responseWithHeaders } = streamFactory<
        typeof API_ENDPOINT.EXPLAIN_LOG_RATE_SPIKES
      >(logger, request.headers);

      async function pushField() {
        setTimeout(() => {
          if (shouldStop) {
            end();
            return;
          }

          const field = fields.pop();

          if (field !== undefined) {
            push(addFieldsAction([field]));
            pushField();
          } else {
            end();
          }
        }, Math.random() * 1000);
      }

      pushField();

      return response.ok(responseWithHeaders);
    }
  );
};
