/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import Boom from '@hapi/boom';
import { RouteDeps } from '../../types';
import { escapeHatch, wrapError } from '../../utils';

import { CASE_CONFIGURE_PUSH_URL } from '../../../../../common/constants';
import {
  ConnectorRequestParamsRt,
  ExternalServiceParams,
  PostPushRequestRt,
  throwErrors,
} from '../../../../../common/api';
import { prepareFieldsForTransformation, transformFields } from './utils';

export function initPostPushToService({ router }: RouteDeps) {
  router.post(
    {
      path: CASE_CONFIGURE_PUSH_URL,
      validate: {
        params: escapeHatch,
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const params = pipe(
          ConnectorRequestParamsRt.decode(request.params),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const body = pipe(
          PostPushRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const connectorId = params.connector_id;
        const mappings = body.mappings;
        const { externalId } = body.params;
        const defaultPipes = externalId ? ['informationUpdated'] : ['informationCreated'];

        const actionsClient = await context.actions?.getActionsClient();
        if (actionsClient == null) {
          throw Boom.notFound('Action client have not been found');
        }
        let currentIncident: ExternalServiceParams | undefined;
        if (externalId) {
          try {
            currentIncident = ((await actionsClient.execute({
              actionId: connectorId,
              params: {
                subAction: 'getIncident',
                subActionParams: body.params,
              },
            })) as unknown) as ExternalServiceParams | undefined;
          } catch (ex) {
            throw new Error(
              `Retrieving Incident by id ${externalId} from Jira failed with exception: ${ex}`
            );
          }
        }

        let incident; // : Incident;
        if (mappings) {
          const fields = prepareFieldsForTransformation({
            externalCase: body.params.externalObject,
            mappings,
            defaultPipes,
          });

          const transformedFields = transformFields<
            PushToServiceApiParams,
            ExternalServiceParams,
            Incident
          >({
            params,
            fields,
            currentIncident,
          });

          const { priority, labels, issueType, parent } = params;
          incident = {
            summary: transformedFields.summary,
            description: transformedFields.description,
            priority,
            labels,
            issueType,
            parent,
          };
        } else {
          const { title, description, priority, labels, issueType, parent } = params;
          incident = { summary: title, description, priority, labels, issueType, parent };
        }
        //
        //
        // if (!context.case) {
        //   throw Boom.badRequest('RouteHandlerContext is not registered for cases');
        // }
        // const caseClient = context.case.getCaseClient();
        //
        // const connectorType = request.query.connector_type;
        // if (connectorType == null) {
        //   throw Boom.illegal('no connectorType value provided');
        // }
        //
        // const actionsClient = await context.actions?.getActionsClient();
        // if (actionsClient == null) {
        //   throw Boom.notFound('Action client have not been found');
        // }
        //
        // const res = await caseClient.getFields({
        //   actionsClient,
        //   connectorId: request.params.connector_id,
        //   connectorType,
        // });
        //
        // return response.ok({
        //   body: res.fields,
        // });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
