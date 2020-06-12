/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_TAGS_URL } from '../../../../../common/constants';

export function initGetTagsApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: CASE_TAGS_URL,
      validate: {},
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const tags = await caseService.getTags({
          client,
        });
        return response.ok({ body: tags });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
