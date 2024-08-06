/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { NOTE_URL } from '../../../../../common/constants';

import type { ConfigType } from '../../../..';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';
import { buildFrameworkRequest } from '../../utils/common';
import { getNotesSchema } from '../../../../../common/api/timeline';
import { buildRouteValidationWithExcess } from '../../../../utils/build_validation/route_validation';
import { getAllSavedNote, MAX_UNASSOCIATED_NOTES } from '../../saved_object/notes';
import { noteSavedObjectType } from '../../saved_object_mappings/notes';

export const getNotesRoute = (router: SecuritySolutionPluginRouter, _: ConfigType) => {
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
          request: { query: buildRouteValidationWithExcess(getNotesSchema) },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        try {
          const queryParams = request.query;
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const documentIds = queryParams.documentIds ?? null;
          if (documentIds != null) {
            if (Array.isArray(documentIds)) {
              const docIdSearchString = documentIds?.join(' | ');
              const options = {
                type: noteSavedObjectType,
                search: docIdSearchString,
                page: 1,
                perPage: MAX_UNASSOCIATED_NOTES,
              };
              const res = await getAllSavedNote(frameworkRequest, options);

              return response.ok({ body: res ?? {} });
            } else {
              const options = {
                type: noteSavedObjectType,
                search: documentIds,
                page: 1,
                perPage: MAX_UNASSOCIATED_NOTES,
              };
              const res = await getAllSavedNote(frameworkRequest, options);

              return response.ok({ body: res ?? {} });
            }
          } else {
            const perPage = queryParams?.perPage ? parseInt(queryParams.perPage, 10) : 10;
            const page = queryParams?.page ? parseInt(queryParams.page, 10) : 1;
            const search = queryParams?.search ?? undefined;
            const sortField = queryParams?.sortField ?? undefined;
            const sortOrder = (queryParams?.sortOrder as SortOrder) ?? undefined;
            const filter = queryParams?.filter;
            const options = {
              type: noteSavedObjectType,
              perPage,
              page,
              search,
              sortField,
              sortOrder,
              filter,
            };
            const res = await getAllSavedNote(frameworkRequest, options);
            return response.ok({ body: res ?? {} });
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
