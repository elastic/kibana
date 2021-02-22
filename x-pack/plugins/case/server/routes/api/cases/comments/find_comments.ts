/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import {
  AssociationType,
  CommentsResponseRt,
  SavedObjectFindOptionsRt,
  throwErrors,
} from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { escapeHatch, transformComments, wrapError } from '../../utils';
import { CASE_COMMENTS_URL } from '../../../../../common/constants';
import { defaultPage, defaultPerPage } from '../..';

const FindQueryParamsRt = rt.partial({
  ...SavedObjectFindOptionsRt.props,
  subCaseID: rt.string,
});

export function initFindCaseCommentsApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: `${CASE_COMMENTS_URL}/_find`,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const query = pipe(
          FindQueryParamsRt.decode(request.query),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const id = query.subCaseID ?? request.params.case_id;
        const associationType = query.subCaseID ? AssociationType.subCase : AssociationType.case;
        const args = query
          ? {
              caseService,
              client,
              id,
              options: {
                // We need this because the default behavior of getAllCaseComments is to return all the comments
                // unless the page and/or perPage is specified. Since we're spreading the query after the request can
                // still override this behavior.
                page: defaultPage,
                perPage: defaultPerPage,
                sortField: 'created_at',
                ...query,
              },
              associationType,
            }
          : {
              caseService,
              client,
              id,
              options: {
                page: defaultPage,
                perPage: defaultPerPage,
                sortField: 'created_at',
              },
              associationType,
            };

        const theComments = await caseService.getCommentsByAssociation(args);
        return response.ok({ body: CommentsResponseRt.encode(transformComments(theComments)) });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
