/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';
import isEmpty from 'lodash/isEmpty';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import {
  flattenCaseSavedObject,
  wrapError,
  escapeHatch,
  getCommentContextFromAttributes,
} from '../utils';

import {
  CaseExternalServiceRequestRt,
  CaseResponseRt,
  throwErrors,
  CaseStatuses,
} from '../../../../common/api';
import { buildCaseUserActionItem } from '../../../services/user_actions/helpers';
import { RouteDeps } from '../types';
import { CASE_DETAILS_URL } from '../../../../common/constants';

export function initPushCaseUserActionApi({
  caseConfigureService,
  caseService,
  router,
  userActionService,
}: RouteDeps) {
  router.post(
    {
      path: `${CASE_DETAILS_URL}/_push`,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const actionsClient = await context.actions?.getActionsClient();

        const caseId = request.params.case_id;
        const query = pipe(
          CaseExternalServiceRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        if (actionsClient == null) {
          throw Boom.notFound('Action client have not been found');
        }

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { username, full_name, email } = await caseService.getUser({ request, response });

        const pushedDate = new Date().toISOString();

        const [myCase, myCaseConfigure, totalCommentsFindByCases, connectors] = await Promise.all([
          caseService.getCase({
            client,
            caseId: request.params.case_id,
          }),
          caseConfigureService.find({ client }),
          caseService.getAllCaseComments({
            client,
            caseId,
            options: {
              fields: [],
              page: 1,
              perPage: 1,
            },
          }),
          actionsClient.getAll(),
        ]);

        if (myCase.attributes.status === CaseStatuses.closed) {
          throw Boom.conflict(
            `This case ${myCase.attributes.title} is closed. You can not pushed if the case is closed.`
          );
        }

        const comments = await caseService.getAllCaseComments({
          client,
          caseId,
          options: {
            fields: [],
            page: 1,
            perPage: totalCommentsFindByCases.total,
          },
        });

        const externalService = {
          pushed_at: pushedDate,
          pushed_by: { username, full_name, email },
          ...query,
        };

        const updateConnector = myCase.attributes.connector;

        if (
          isEmpty(updateConnector) ||
          (updateConnector != null && updateConnector.id === 'none') ||
          !connectors.some((connector) => connector.id === updateConnector.id)
        ) {
          throw Boom.notFound('Connector not found or set to none');
        }

        const [updatedCase, updatedComments] = await Promise.all([
          caseService.patchCase({
            client,
            caseId,
            updatedAttributes: {
              ...(myCaseConfigure.total > 0 &&
              myCaseConfigure.saved_objects[0].attributes.closure_type === 'close-by-pushing'
                ? {
                    status: CaseStatuses.closed,
                    closed_at: pushedDate,
                    closed_by: { email, full_name, username },
                  }
                : {}),
              external_service: externalService,
              updated_at: pushedDate,
              updated_by: { username, full_name, email },
            },
            version: myCase.version,
          }),
          caseService.patchComments({
            client,
            comments: comments.saved_objects
              .filter((comment) => comment.attributes.pushed_at == null)
              .map((comment) => ({
                commentId: comment.id,
                updatedAttributes: {
                  pushed_at: pushedDate,
                  pushed_by: { username, full_name, email },
                },
                version: comment.version,
              })),
          }),
          userActionService.postUserActions({
            client,
            actions: [
              ...(myCaseConfigure.total > 0 &&
              myCaseConfigure.saved_objects[0].attributes.closure_type === 'close-by-pushing'
                ? [
                    buildCaseUserActionItem({
                      action: 'update',
                      actionAt: pushedDate,
                      actionBy: { username, full_name, email },
                      caseId,
                      fields: ['status'],
                      newValue: CaseStatuses.closed,
                      oldValue: myCase.attributes.status,
                    }),
                  ]
                : []),
              buildCaseUserActionItem({
                action: 'push-to-service',
                actionAt: pushedDate,
                actionBy: { username, full_name, email },
                caseId,
                fields: ['pushed'],
                newValue: JSON.stringify(externalService),
              }),
            ],
          }),
        ]);

        return response.ok({
          body: CaseResponseRt.encode(
            flattenCaseSavedObject({
              savedObject: {
                ...myCase,
                ...updatedCase,
                attributes: { ...myCase.attributes, ...updatedCase?.attributes },
                references: myCase.references,
              },
              comments: comments.saved_objects.map((origComment) => {
                const updatedComment = updatedComments.saved_objects.find(
                  (c) => c.id === origComment.id
                );
                return {
                  ...origComment,
                  ...updatedComment,
                  attributes: {
                    ...origComment.attributes,
                    ...updatedComment?.attributes,
                    ...getCommentContextFromAttributes(origComment.attributes),
                  },
                  version: updatedComment?.version ?? origComment.version,
                  references: origComment?.references ?? [],
                };
              }),
            })
          ),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
