/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core-http-server';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import {
  DATA_STREAM_CHECK_PATH,
  getDatastreamCheckRequestParamsRT,
  getDatastreamCheckRequestPayloadRT,
  GetDatastreamCheckResponsePayload,
  getDatastreamCheckResponsePayloadRT,
} from '../../common';
import { DatasetQualityRequestHandlerContext } from '../types';

export const registerDataStreamQualityCheckRoute = ({
  router,
}: {
  router: IRouter<DatasetQualityRequestHandlerContext>;
}) => {
  router.versioned
    .post({
      access: 'internal',
      path: DATA_STREAM_CHECK_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createRouteValidationFunction(getDatastreamCheckRequestPayloadRT),
            params: createRouteValidationFunction(getDatastreamCheckRequestParamsRT),
          },
          response: {
            200: {
              body: createRouteValidationFunction(getDatastreamCheckResponsePayloadRT),
            },
          },
        },
      },
      async (ctx, req, res) => {
        const { checkId, dataStream } = req.params;
        const timeRange = {
          start: req.body.time_range.start,
          end: req.body.time_range.end,
        };

        const checkExecution = await (
          await ctx.datasetQuality
        ).dataStreamQualityService.performCheck(checkId, {
          dataStream,
          timeRange,
        });

        return res.ok<GetDatastreamCheckResponsePayload>({
          body: getDatastreamCheckResponsePayloadRT.encode({
            result: checkExecution,
          }),
        });
      }
    );
};
