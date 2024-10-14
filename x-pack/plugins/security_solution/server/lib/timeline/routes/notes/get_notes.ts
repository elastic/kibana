/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
import { nodeBuilder } from '@kbn/es-query';
import { timelineSavedObjectType } from '../../saved_object_mappings';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { MAX_UNASSOCIATED_NOTES, NOTE_URL } from '../../../../../common/constants';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';
import { buildFrameworkRequest } from '../../utils/common';
import { getAllSavedNote } from '../../saved_object/notes';
import { noteSavedObjectType } from '../../saved_object_mappings/notes';
import { GetNotesRequestQuery, type GetNotesResponse } from '../../../../../common/api/timeline';

export const getNotesRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      path: NOTE_URL,
      options: {
        tags: ['access:securitySolution'],
      },
      access: 'public',
    })
    .addVersion(
      {
        validate: {
          request: { query: buildRouteValidationWithZod(GetNotesRequestQuery) },
        },
        version: '2023-10-31',
      },
      async (context, request, response): Promise<IKibanaResponse<GetNotesResponse>> => {
        try {
          const queryParams = request.query;
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const {
            uiSettings: { client: uiSettingsClient },
          } = await frameworkRequest.context.core;
          const maxUnassociatedNotes = await uiSettingsClient.get<number>(MAX_UNASSOCIATED_NOTES);

          // if documentIds is provided, we will search for all the notes associated with the documentIds
          const documentIds = queryParams.documentIds ?? null;
          if (documentIds != null) {
            // search for multiple document ids (like retrieving all the notes for all the alerts within a table)
            if (Array.isArray(documentIds)) {
              const options: SavedObjectsFindOptions = {
                type: noteSavedObjectType,
                filter: nodeBuilder.or(
                  documentIds.map((documentId: string) =>
                    nodeBuilder.is(`${noteSavedObjectType}.attributes.eventId`, documentId)
                  )
                ),
                page: 1,
                perPage: maxUnassociatedNotes,
              };
              const res = await getAllSavedNote(frameworkRequest, options);
              const body: GetNotesResponse = res ?? {};
              return response.ok({ body });
            }

            // searching for all the notes associated with a specific document id
            const options: SavedObjectsFindOptions = {
              type: noteSavedObjectType,
              filter: nodeBuilder.is(`${noteSavedObjectType}.attributes.eventId`, documentIds),
              page: 1,
              perPage: maxUnassociatedNotes,
            };
            const res = await getAllSavedNote(frameworkRequest, options);
            return response.ok({ body: res ?? {} });
          }

          // if savedObjectIds is provided, we will search for all the notes associated with the savedObjectIds
          const savedObjectIds = queryParams.savedObjectIds ?? null;
          if (savedObjectIds != null) {
            // search for multiple saved object ids
            if (Array.isArray(savedObjectIds)) {
              const options: SavedObjectsFindOptions = {
                type: noteSavedObjectType,
                hasReference: savedObjectIds.map((savedObjectId: string) => ({
                  type: timelineSavedObjectType,
                  id: savedObjectId,
                })),
                page: 1,
                perPage: maxUnassociatedNotes,
              };
              const res = await getAllSavedNote(frameworkRequest, options);
              const body: GetNotesResponse = res ?? {};
              return response.ok({ body });
            }

            // searching for all the notes associated with a specific for saved object id
            const options: SavedObjectsFindOptions = {
              type: noteSavedObjectType,
              hasReference: {
                type: timelineSavedObjectType,
                id: savedObjectIds,
              },
              perPage: maxUnassociatedNotes,
            };
            const res = await getAllSavedNote(frameworkRequest, options);
            const body: GetNotesResponse = res ?? {};
            return response.ok({ body });
          }

          // retrieving all the notes following the query parameters
          const perPage = queryParams?.perPage ? parseInt(queryParams.perPage, 10) : 10;
          const page = queryParams?.page ? parseInt(queryParams.page, 10) : 1;
          const search = queryParams?.search ?? undefined;
          const sortField = queryParams?.sortField ?? undefined;
          const sortOrder = (queryParams?.sortOrder as SortOrder) ?? undefined;
          const filter = queryParams?.filter;
          const options: SavedObjectsFindOptions = {
            type: noteSavedObjectType,
            perPage,
            page,
            search,
            sortField,
            sortOrder,
            filter,
          };
          const res = await getAllSavedNote(frameworkRequest, options);
          const body: GetNotesResponse = res ?? {};
          return response.ok({ body });
        } catch (err) {
          const error = transformError(err);
          const siemResponse = buildSiemResponse(response);

          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
