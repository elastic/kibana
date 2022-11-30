/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AWS from 'aws-sdk';
import { schema, TypeOf } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
} from '@kbn/core/server';

const bodySchema = schema.object({
  accessKeyId: schema.string(),
  secretAccessKey: schema.string(),
  sessionToken: schema.string(),
});

export function registerRoutes(router: IRouter<RequestHandlerContext>) {
  router.post(
    {
      path: '/api/scheduler/aws-config',
      validate: {
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(async function (
      context: RequestHandlerContext,
      req: KibanaRequest<unknown, unknown, TypeOf<typeof bodySchema>>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      AWS.config.update({
        region: 'us-east-2',
        credentials: new AWS.Credentials(
          req.body.accessKeyId,
          req.body.secretAccessKey,
          req.body.sessionToken
        ),
      });
      console.log('SQS: AWS settings updated');
      return res.ok();
    })
  );
}
