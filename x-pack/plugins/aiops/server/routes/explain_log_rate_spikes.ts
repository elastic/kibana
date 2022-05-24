/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { firstValueFrom } from 'rxjs';

import type { IRouter, Logger } from '@kbn/core/server';
import type { DataRequestHandlerContext, IEsSearchRequest } from '@kbn/data-plugin/server';
import { streamFactory } from '@kbn/aiops-utils';

import {
  aiopsExplainLogRateSpikesSchema,
  initializeAction,
  AiopsExplainLogRateSpikesApiAction,
} from '../../common/api/explain_log_rate_spikes';
import { API_ENDPOINT } from '../../common/api';

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

      // const search = await context.search;
      // const res = await firstValueFrom(
      //   search.search(
      //     {
      //       params: {
      //         index,
      //         body: { size: 1 },
      //       },
      //     } as IEsSearchRequest,
      //     { abortSignal: controller.signal }
      //   )
      // );

      const { end, push, responseWithHeaders } = streamFactory<AiopsExplainLogRateSpikesApiAction>(
        request.headers
      );

      // Async IIFE to run the analysis while not blocking returning `responseWithHeaders`.
      (async () => {
        push(
          initializeAction({
            ccsWarning: false,
            loaded: 0,
            loadingState: 'Loading field candidates.',
          })
        );

        // This iteration just takes in an index name and based on a date histogram we identify the window params.
        // Eventually it should be possible to pass these attributes from the client based on the brush selection.

        end();
      })();

      return response.ok(responseWithHeaders);
    }
  );
};
