/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseConfigureResponseRt } from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';

export function initGetCaseConfigure({ caseConfigureService, caseService, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases/configure',
      validate: false,
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;

        const myCaseConfigure = await caseConfigureService.find({ client });

        return response.ok({
          body:
            myCaseConfigure.saved_objects.length > 0
              ? CaseConfigureResponseRt.encode({
                  ...myCaseConfigure.saved_objects[0].attributes,
                  version: myCaseConfigure.saved_objects[0].version ?? '',
                })
              : {},
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
