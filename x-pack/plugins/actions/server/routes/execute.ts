/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'kibana/server';
import { assertNever } from '../../../../../src/core/utils';
import { ILicenseState, verifyApiAccess, ActionTypeDisabledError } from '../lib';

import { ActionExecutorContract } from '../lib';
import { ActionTypeExecutorResult } from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

const bodySchema = schema.object({
  params: schema.recordOf(schema.string(), schema.any()),
});

export const executeActionRoute = (
  router: IRouter,
  licenseState: ILicenseState,
  actionExecutor: ActionExecutorContract
) => {
  router.post(
    {
      path: '/api/action/{id}/_execute',
      validate: {
        body: bodySchema,
        params: paramSchema,
      },
      options: {
        tags: ['access:actions-read'],
      },
    },
    router.handleLegacyErrors(async function(
      context: RequestHandlerContext,
      req: KibanaRequest<TypeOf<typeof paramSchema>, any, TypeOf<typeof bodySchema>, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      verifyApiAccess(licenseState);
      const { params } = req.body;
      const { id } = req.params;
      try {
        const body: ActionTypeExecutorResult = await actionExecutor.execute({
          params,
          request: req,
          actionId: id,
        });
        return body
          ? res.ok({
              body,
            })
          : res.noContent();
      } catch (e) {
        if (e instanceof ActionTypeDisabledError) {
          switch (e.reason) {
            case 'config':
              return res.badRequest({ body: { message: e.message } });
            case 'license_unavailable':
            case 'license_invalid':
            case 'license_expired':
              return res.forbidden({ body: { message: e.message } });
            default:
              assertNever(e.reason);
          }
        }
        throw e;
      }
    })
  );
};
