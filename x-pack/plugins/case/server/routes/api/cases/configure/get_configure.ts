/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseConfigureResponseRt } from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_CONFIGURE_URL } from '../../../../../common/constants';
import { transformESConnectorToCaseConnector } from '../helpers';

export function initGetCaseConfigure({ caseConfigureService, router }: RouteDeps) {
  router.get(
    {
      path: CASE_CONFIGURE_URL,
      validate: false,
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;

        const myCaseConfigure = await caseConfigureService.find({ client });

        const { connector, ...caseConfigureWithoutConnector } = myCaseConfigure.saved_objects[0]
          ?.attributes ?? { connector: null };

        return response.ok({
          body:
            myCaseConfigure.saved_objects.length > 0
              ? CaseConfigureResponseRt.encode({
                  ...caseConfigureWithoutConnector,
                  connector: transformESConnectorToCaseConnector(connector),
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
