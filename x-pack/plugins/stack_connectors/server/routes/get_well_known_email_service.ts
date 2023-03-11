/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from '@kbn/core/server';
import nodemailerGetService from 'nodemailer/lib/well-known';
import SMTPConnection from 'nodemailer/lib/smtp-connection';
import { AdditionalEmailServices, INTERNAL_BASE_STACK_CONNECTORS_API_PATH } from '../../common';
import { ELASTIC_CLOUD_SERVICE } from '../connector_types/email';

const paramSchema = schema.object({
  service: schema.string(),
});

export const getWellKnownEmailServiceRoute = (router: IRouter) => {
  router.get(
    {
      path: `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/_email_config/{service}`,
      validate: {
        params: paramSchema,
      },
    },
    handler
  );

  async function handler(
    ctx: RequestHandlerContext,
    req: KibanaRequest<{ service: string }, unknown, unknown>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    const { service } = req.params;

    let response: SMTPConnection.Options = {};
    if (service === AdditionalEmailServices.ELASTIC_CLOUD) {
      response = ELASTIC_CLOUD_SERVICE;
    } else {
      const serviceEntry = nodemailerGetService(service);
      if (serviceEntry) {
        response = {
          host: serviceEntry.host,
          port: serviceEntry.port,
          secure: serviceEntry.secure,
        };
      }
    }

    return res.ok({
      body: response,
    });
  }
};
