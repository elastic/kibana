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
  getDatastreamChecksRequestPayloadRT,
  GetDatastreamChecksResponsePayload,
  getDatastreamChecksResponsePayloadRT,
} from '../../common';

export const registerDataStreamQualityChecksRoute = ({ router }: { router: IRouter }) => {
  router.versioned
    .get({
      access: 'internal',
      path: DATA_STREAM_CHECKS_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createRouteValidationFunction(getDatastreamChecksRequestPayloadRT),
          },
          response: {
            200: {
              body: createRouteValidationFunction(getDatastreamChecksResponsePayloadRT),
            },
          },
        },
      },
      async (ctx, req, res) => {
        return res.ok<GetDatastreamChecksResponsePayload>({
          body: null,
        });
        return res.badRequest();
      }
    );
};
