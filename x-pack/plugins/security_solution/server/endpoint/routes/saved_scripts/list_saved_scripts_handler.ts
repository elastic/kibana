/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { omit } from 'lodash';
import type { TypeOf } from '@kbn/config-schema';
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

export const listSavedScriptRequestHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  TypeOf<typeof ActionDetailsRequestSchema.params>,
  never,
  never,
  SecuritySolutionRequestHandlerContext
> => {
  return async (context, request, response) => {
    const coreContext = await context.core;
    const savedObjectsClient = coreContext.savedObjects.client;

    try {
      const savedScripts = await savedObjectsClient.find<SavedScriptSavedObject>({
        type: savedScriptsObjectType,
        page: request.query.page || 1,
        perPage: request.query.pageSize,
        sortField: request.query.sort || 'id',
        sortOrder: request.query.sortOrder || 'desc',
      });

      // const prebuiltsavedScriptsMap = await getInstalledsavedScriptsMap(
      //   osqueryContext.service.getPackageService()?.asInternalUser
      // );
      const savedObjects: any[] = savedScripts.saved_objects.map((savedObject) => {
        // const savedObjects: SavedQueryResponse[] = savedScripts.saved_objects.map((savedObject) => {
        // const ecs_mapping = savedObject.attributes.ecs_mapping;

        // savedObject.attributes.prebuilt = !!prebuiltsavedScriptsMap[savedObject.id];

        // if (ecs_mapping) {
        //   // @ts-expect-error update types
        //   savedObject.attributes.ecs_mapping = convertECSMappingToObject(ecs_mapping);
        // }

        const {
          created_at: createdAt,
          created_by: createdBy,
          description,
          id,
          timeout,
          platform,
          command,
          updated_at: updatedAt,
          updated_by: updatedBy,
          // prebuilt,
        } = savedObject.attributes;

        return {
          created_at: createdAt,
          created_by: createdBy,
          description,
          id,
          timeout,
          platform,
          command,
          updated_at: updatedAt,
          updated_by: updatedBy,
          // prebuilt,
          saved_object_id: savedObject.id,
        };
      });

      return response.ok({
        body: {
          ...omit(savedScripts, 'saved_objects'),
          data: savedObjects,
        },
      });
    } catch (error) {
      return errorHandler(endpointContext.logFactory.get('EndpointActionDetails'), response, error);
    }
  };
};
