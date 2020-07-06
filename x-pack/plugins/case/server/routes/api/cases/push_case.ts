/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import Boom from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { flattenCaseSavedObject, wrapError, escapeHatch } from '../utils';

import { CaseExternalServiceRequestRt, CaseResponseRt, throwErrors } from '../../../../common/api';
import { buildCaseUserActionItem } from '../../../services/user_actions/helpers';
import { RouteDeps } from '../types';
import { CASE_DETAILS_URL } from '../../../../common/constants';
import { getConnectorId } from './helpers';

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

        if (myCase.attributes.status === 'closed') {
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

        const caseConfigureConnectorId = getConnectorId(myCaseConfigure);

        // old case may not have new attribute connector_id, so we default to the configured system
        const updateConnectorId = {
          connector_id: myCase.attributes.connector_id ?? caseConfigureConnectorId,
        };

        if (!connectors.some((connector) => connector.id === updateConnectorId.connector_id)) {
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
                    status: 'closed',
                    closed_at: pushedDate,
                    closed_by: { email, full_name, username },
                  }
                : {}),
              external_service: externalService,
              updated_at: pushedDate,
              updated_by: { username, full_name, email },
              ...updateConnectorId,
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
                      newValue: 'closed',
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
