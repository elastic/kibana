/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_TAGS_URL } from '../../../../../common';

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
