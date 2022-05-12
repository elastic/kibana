/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

import {
  aiopsExplainLogRateSpikesSchema,
  addFieldsAction,
} from '../../common/api/explain_log_rate_spikes';
import { API_ENDPOINT } from '../../common/api';

import { streamFactory } from './stream_factory';

export const defineExplainLogRateSpikesRoute = (router: IRouter, logger: Logger) => {
  router.post(
    {
      path: API_ENDPOINT.EXPLAIN_LOG_RATE_SPIKES,
      validate: {
        body: aiopsExplainLogRateSpikesSchema,
      },
    },
    async (context, request, response) => {
      // const index = request.body.index;

      let shouldStop = false;
      request.events.aborted$.subscribe(() => {
        shouldStop = true;
      });
      request.events.completed$.subscribe(() => {
        shouldStop = true;
      });

      const { stream, streamPush } =
        streamFactory<typeof API_ENDPOINT.EXPLAIN_LOG_RATE_SPIKES>(logger);

      setTimeout(() => {
        if (shouldStop) {
          stream.push(null);
          return;
        }
        streamPush(addFieldsAction(['firstField']));
      }, 0);

      setTimeout(() => {
        if (shouldStop) {
          stream.push(null);
          return;
        }
        streamPush(addFieldsAction(['secondField', 'thirdField']));
      }, 500);

      setTimeout(() => {
        if (shouldStop) {
          stream.push(null);
          return;
        }
        streamPush(addFieldsAction(['last_field']));
        stream.push(null);
      }, 3000);

      return response.ok({
        body: stream,
      });
    }
  );
};
