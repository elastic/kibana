/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { SavedObjectsFindResponse } from 'kibana/server';
import { AllCommentsResponseRt, CommentAttributes } from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { flattenCommentSavedObjects, wrapError } from '../../utils';
import { CASE_COMMENTS_URL } from '../../../../../common/constants';
import { defaultSortField } from '../../../../common';

export function initGetAllCommentsApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: CASE_COMMENTS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: schema.maybe(
          schema.object({
            includeSubCaseComments: schema.maybe(schema.boolean()),
            subCaseID: schema.maybe(schema.string()),
          })
        ),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        let comments: SavedObjectsFindResponse<CommentAttributes>;

        if (request.query?.subCaseID) {
          comments = await caseService.getAllSubCaseComments({
            client,
            id: request.query.subCaseID,
            options: {
              sortField: defaultSortField,
            },
          });
        } else {
          comments = await caseService.getAllCaseComments({
            client,
            id: request.params.case_id,
            includeSubCaseComments: request.query?.includeSubCaseComments,
            options: {
              sortField: defaultSortField,
            },
          });
        }

        return response.ok({
          body: AllCommentsResponseRt.encode(flattenCommentSavedObjects(comments.saved_objects)),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
