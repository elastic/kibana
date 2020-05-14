/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

export function registerGetAllRoute({ router, license, lib }: RouteDependencies) {
  router.get(
    { path: addBasePath('/component_templates'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;

      try {
        const response = await callAsCurrentUser('dataManagement.getComponentTemplates');

        return res.ok({ body: response.component_templates });
      } catch (error) {
        if (lib.isEsError(error)) {
          return res.customError({
            statusCode: error.statusCode,
            body: error,
          });
        }

        return res.internalError({ body: error });
      }
    })
  );
}
