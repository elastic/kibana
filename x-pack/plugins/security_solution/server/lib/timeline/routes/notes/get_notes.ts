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
import type {
  SavedObjectsFindOptions,
  SavedObjectsFindOptionsReference,
} from '@kbn/core-saved-objects-api-server';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder, nodeTypes } from '@kbn/es-query';
import { AssociatedFilter } from '../../../../../common/notes/constants';
import { timelineSavedObjectType } from '../../saved_object_mappings';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { NOTE_URL } from '../../../../../common/constants';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';
import { buildFrameworkRequest } from '../../utils/common';
import { getAllSavedNote, MAX_UNASSOCIATED_NOTES } from '../../saved_object/notes';
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
          const documentIds = queryParams.documentIds ?? null;
          const savedObjectIds = queryParams.savedObjectIds ?? null;
          if (documentIds != null) {
            if (Array.isArray(documentIds)) {
              const docIdSearchString = documentIds?.join(' | ');
              const options: SavedObjectsFindOptions = {
                type: noteSavedObjectType,
                search: docIdSearchString,
                page: 1,
                perPage: MAX_UNASSOCIATED_NOTES,
              };
              const res = await getAllSavedNote(frameworkRequest, options);
              const body: GetNotesResponse = res ?? {};
              return response.ok({ body });
            } else {
              const options: SavedObjectsFindOptions = {
                type: noteSavedObjectType,
                search: documentIds,
                page: 1,
                perPage: MAX_UNASSOCIATED_NOTES,
              };
              const res = await getAllSavedNote(frameworkRequest, options);
              return response.ok({ body: res ?? {} });
            }
          } else if (savedObjectIds != null) {
            if (Array.isArray(savedObjectIds)) {
              const soIdSearchString = savedObjectIds?.join(' | ');
              const options: SavedObjectsFindOptions = {
                type: noteSavedObjectType,
                hasReference: {
                  type: timelineSavedObjectType,
                  id: soIdSearchString,
                },
                page: 1,
                perPage: MAX_UNASSOCIATED_NOTES,
              };
              const res = await getAllSavedNote(frameworkRequest, options);
              const body: GetNotesResponse = res ?? {};
              return response.ok({ body });
            } else {
              const options: SavedObjectsFindOptions = {
                type: noteSavedObjectType,
                hasReference: {
                  type: timelineSavedObjectType,
                  id: savedObjectIds,
                },
                perPage: MAX_UNASSOCIATED_NOTES,
              };
              const res = await getAllSavedNote(frameworkRequest, options);
              const body: GetNotesResponse = res ?? {};
              return response.ok({ body });
            }
          } else {
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

            const associatedFilter = queryParams?.associatedFilter;
            if (associatedFilter) {
              // we need to combine the associatedFilter with the filter query
              // we have to type case here because the filter is a string (from the schema) and that cannot be changed as it would be a breaking change
              const filterAsKueryNode: KueryNode = (filter || '') as unknown as KueryNode;

              // select documents that have or don't have a reference to an empty value
              // used in combination with hasReference (not associated with a timeline) or hasNoReference (associated with a timeline)
              const referenceToATimeline: SavedObjectsFindOptionsReference = {
                type: timelineSavedObjectType,
                id: '',
              };

              // select documents that don't have a value in the eventId field (not associated with a document)
              const emptyDocumentIdFilter: KueryNode = nodeBuilder.is(
                `${noteSavedObjectType}.attributes.eventId`,
                ''
              );

              // TODO write unit tests
              switch (associatedFilter) {
                case AssociatedFilter.documentOnly:
                  // select documents that have a reference to an empty saved object id (not associated with a timeline)
                  // and have a value in the eventId field (associated with a document)
                  options.hasReference = referenceToATimeline;
                  options.filter = nodeBuilder.and([
                    nodeTypes.function.buildNode('not', emptyDocumentIdFilter),
                    filterAsKueryNode,
                  ]);
                  break;
                case AssociatedFilter.savedObjectOnly:
                  // select documents that don't have a reference to an empty saved object id (associated with a timeline)
                  // and don't have a value in the eventId field (not associated with a document)
                  options.hasNoReference = referenceToATimeline;
                  options.filter = nodeBuilder.and([emptyDocumentIdFilter, filterAsKueryNode]);
                  break;
                case AssociatedFilter.documentAndSavedObject:
                  // select documents that don't have a reference to an empty saved object id (associated with a timeline)
                  // and have a value in the eventId field (associated with a document)
                  options.hasNoReference = referenceToATimeline;
                  options.filter = nodeBuilder.and([
                    nodeTypes.function.buildNode('not', emptyDocumentIdFilter),
                    filterAsKueryNode,
                  ]);
                  break;
                case AssociatedFilter.orphan:
                  // select documents that have a reference to an empty saved object id (not associated with a timeline)
                  // and don't have a value in the eventId field (not associated with a document)
                  options.hasReference = referenceToATimeline;
                  // TODO we might want to also check for the existence of the eventId field, on top of getting eventId having empty values
                  options.filter = nodeBuilder.and([emptyDocumentIdFilter, filterAsKueryNode]);
                  break;
                default:
                  options.filter = filter;
              }
            }

            const res = await getAllSavedNote(frameworkRequest, options);
            const body: GetNotesResponse = res ?? {};
            return response.ok({ body });
          }
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
