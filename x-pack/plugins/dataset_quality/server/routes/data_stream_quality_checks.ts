/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core-http-server';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import {
  DATA_STREAM_CHECKS_PATH,
  getDatastreamChecksRequestParamsRT,
  getDatastreamChecksRequestPayloadRT,
  GetDatastreamChecksResponsePayload,
  getDatastreamChecksResponsePayloadRT,
} from '../../common';
import { DatasetQualityRequestHandlerContext } from '../types';

export const registerDataStreamQualityChecksRoute = ({
  router,
}: {
  router: IRouter<DatasetQualityRequestHandlerContext>;
}) => {
  router.versioned
    .post({
      access: 'internal',
      path: DATA_STREAM_CHECKS_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createRouteValidationFunction(getDatastreamChecksRequestPayloadRT),
            params: createRouteValidationFunction(getDatastreamChecksRequestParamsRT),
          },
          response: {
            200: {
              body: createRouteValidationFunction(getDatastreamChecksResponsePayloadRT),
            },
          },
        },
      },
      async (ctx, req, res) => {
        const dataStream = req.params.dataStream;
        const timeRange = {
          start: req.body.time_range.start,
          end: req.body.time_range.end,
        };

        const checks = (
          await (
            await ctx.datasetQuality
          ).dataStreamQualityService.getChecks({
            dataStream,
            timeRange,
          })
        ).map((check) => ({
          check_id: check.checkId,
          data_stream: check.dataStream,
          time_range: check.timeRange,
        }));

        return res.ok<GetDatastreamChecksResponsePayload>({
          body: getDatastreamChecksResponsePayloadRT.encode({
            plan: {
              data_stream: dataStream,
              time_range: timeRange,
              checks,
            },
          }),
        });
      }
    );
};
