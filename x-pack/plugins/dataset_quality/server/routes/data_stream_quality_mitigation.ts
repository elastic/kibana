/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core-http-server';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import {
  DATA_STREAM_MITIGATION_PATH,
  postDatastreamMitigationRequestParamsRT,
  postDatastreamMitigationRequestPayloadRT,
  PostDatastreamMitigationResponsePayload,
  postDatastreamMitigationResponsePayloadRT,
} from '../../common';
import { DatasetQualityRequestHandlerContext } from '../types';

export const registerDataStreamQualityMitigationRoute = ({
  router,
}: {
  router: IRouter<DatasetQualityRequestHandlerContext>;
}) => {
  router.versioned
    .post({
      access: 'internal',
      path: DATA_STREAM_MITIGATION_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createRouteValidationFunction(postDatastreamMitigationRequestPayloadRT),
            params: createRouteValidationFunction(postDatastreamMitigationRequestParamsRT),
          },
          response: {
            200: {
              body: createRouteValidationFunction(postDatastreamMitigationResponsePayloadRT),
            },
          },
        },
      },
      async (ctx, req, res) => {
        const { dataStream } = req.params;
        const { type: mitigationId, ...mitigationArgs } = req.body.mitigation;

        const result = await (
          await ctx.datasetQuality
        ).dataStreamQualityService.applyMitigation(mitigationId, {
          data_stream: dataStream,
          ...mitigationArgs,
        });

        return res.ok<PostDatastreamMitigationResponsePayload>({
          body: postDatastreamMitigationResponsePayloadRT.encode({
            result,
          }),
        });
      }
    );
};
