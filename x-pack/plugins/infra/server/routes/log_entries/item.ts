/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createValidationFunction } from '../../../common/runtime_types';

import { InfraBackendLibs } from '../../lib/infra_types';
import {
  LOG_ENTRIES_ITEM_PATH,
  logEntriesItemRequestRT,
  logEntriesItemResponseRT,
} from '../../../common/http_api';

export const initLogEntriesItemRoute = ({ framework, sources, logEntries }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ENTRIES_ITEM_PATH,
      validate: { body: createValidationFunction(logEntriesItemRequestRT) },
    },
    async (requestContext, request, response) => {
      try {
        const payload = request.body;
        const { id, sourceId } = payload;
        const sourceConfiguration = (
          await sources.getSourceConfiguration(requestContext.core.savedObjects.client, sourceId)
        ).configuration;

        const logEntry = await logEntries.getLogItem(requestContext, id, sourceConfiguration);

        return response.ok({
          body: logEntriesItemResponseRT.encode({
            data: logEntry,
          }),
        });
      } catch (error) {
        return response.internalError({ body: error.message });
      }
    }
  );
};
