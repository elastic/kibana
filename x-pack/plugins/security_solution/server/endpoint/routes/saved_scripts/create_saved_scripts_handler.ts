/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { pickBy, isEmpty, some, isBoolean, isNumber } from 'lodash';
import type { ActionDetailsRequestSchema } from '../../../../common/api/endpoint';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import type { EndpointAppContext } from '../../types';
import { errorHandler } from '../error_handler';
import { savedScriptsObjectType } from '../../lib/saved_objects/saved_scripts';
import type { SavedScriptSavedObject } from './types';
/**
 * Registers the route for handling retrieval of Action Details
 * @param router
 * @param endpointContext
 */

export const createSavedScriptRequestHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  TypeOf<typeof ActionDetailsRequestSchema.params>,
  never,
  never,
  SecuritySolutionRequestHandlerContext
> => {
  return async (context, request, response) => {
    try {
      const coreContext = await context.core;
      const savedObjectsClient = coreContext.savedObjects.client;
      const currentUser = endpointContext.service.security?.authc.getCurrentUser(request);

      const { id, description, platform, command, timeout } = request.body;
      const conflictingEntries = await savedObjectsClient.find<SavedScriptSavedObject>({
        type: savedScriptsObjectType,
        filter: `${savedScriptsObjectType}.attributes.id: "${id}"`,
      });
      if (
        conflictingEntries.saved_objects.length &&
        some(conflictingEntries.saved_objects, ['attributes.id', id])
      ) {
        return response.conflict({ body: `Saved query with id "${id}" already exists.` });
      }

      const savedQuerySO = await savedObjectsClient.create(
        savedScriptsObjectType,
        pickBy(
          {
            id,
            description,
            command,
            platform,
            timeout,
            created_by: currentUser?.username || 'elastic',
            created_at: new Date().toISOString(),
            updated_by: currentUser?.username || 'elastic',
            updated_at: new Date().toISOString(),
          },
          (value) => !isEmpty(value) || isBoolean(value) || isNumber(value)
        )
      );

      const { attributes } = savedQuerySO;

      const data: Partial<any> = pickBy(
        // const data: Partial<SavedQueryResponse> = pickBy(
        {
          command: attributes.query,
          created_at: attributes.created_at,
          created_by: attributes.created_by,
          description: attributes.description,
          id: attributes.id,
          timeout: attributes.timeout,
          platform: attributes.platform,
          updated_at: attributes.updated_at,
          updated_by: attributes.updated_by,
          saved_object_id: savedQuerySO.id,
        },
        (value) => !isEmpty(value) || isNumber(value)
      );
      return response.ok({
        body: {
          data,
        },
      });
    } catch (error) {
      return errorHandler(endpointContext.logFactory.get('EndpointActionDetails'), response, error);
    }
  };
};
