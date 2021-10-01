/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { RequestHandler } from 'src/core/server';
import uuid from 'uuid';
import { TypeOf } from '@kbn/config-schema';
import { CommentType } from '../../../../../cases/common';
import { CasesByAlertId } from '../../../../../cases/common/api/cases/case';
import { HostIsolationRequestSchema } from '../../../../common/endpoint/schema/actions';
import { ISOLATE_HOST_ROUTE, UNISOLATE_HOST_ROUTE } from '../../../../common/endpoint/constants';
import { AGENT_ACTIONS_INDEX } from '../../../../../fleet/common';
import { EndpointAction, HostMetadata } from '../../../../common/endpoint/types';
import {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import { getMetadataForEndpoints } from '../../services';
import { EndpointAppContext } from '../../types';
import { APP_ID } from '../../../../common/constants';
import { userCanIsolate } from '../../../../common/endpoint/actions';

/**
 * Registers the Host-(un-)isolation routes
 */
export function registerHostIsolationRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  // perform isolation
  router.post(
    {
      path: ISOLATE_HOST_ROUTE,
      validate: HostIsolationRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    isolationRequestHandler(endpointContext, true)
  );

  // perform UN-isolate
  router.post(
    {
      path: UNISOLATE_HOST_ROUTE,
      validate: HostIsolationRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    isolationRequestHandler(endpointContext, false)
  );
}

export const isolationRequestHandler = function (
  endpointContext: EndpointAppContext,
  isolate: boolean
): RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof HostIsolationRequestSchema.body>,
  SecuritySolutionRequestHandlerContext
> {
  return async (context, req, res) => {
    // only allow admin users
    const user = endpointContext.service.security?.authc.getCurrentUser(req);
    if (!userCanIsolate(user?.roles)) {
      return res.forbidden({
        body: {
          message: 'You do not have permission to perform this action',
        },
      });
    }

    // isolation requires plat+
    if (isolate && !endpointContext.service.getLicenseService()?.isPlatinumPlus()) {
      return res.forbidden({
        body: {
          message: 'Your license level does not allow for this action',
        },
      });
    }

    // fetch the Agent IDs to send the commands to
    const endpointIDs = [...new Set(req.body.endpoint_ids)]; // dedupe
    const endpointData = await getMetadataForEndpoints(endpointIDs, context);

    const casesClient = await endpointContext.service.getCasesClient(req);

    // convert any alert IDs into cases
    let caseIDs: string[] = req.body.case_ids?.slice() || [];
    if (req.body.alert_ids && req.body.alert_ids.length > 0) {
      const newIDs: string[][] = await Promise.all(
        req.body.alert_ids.map(async (a: string) => {
          const cases: CasesByAlertId = await casesClient.cases.getCasesByAlertID({
            alertID: a,
            options: { owner: APP_ID },
          });
          return cases.map((caseInfo): string => {
            return caseInfo.id;
          });
        })
      );
      caseIDs = caseIDs.concat(...newIDs);
    }
    caseIDs = [...new Set(caseIDs)];

    // create an Action ID and dispatch it to ES & Fleet Server
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    const actionID = uuid.v4();
    let result;
    try {
      result = await esClient.index<EndpointAction>({
        index: AGENT_ACTIONS_INDEX,
        body: {
          action_id: actionID,
          '@timestamp': moment().toISOString(),
          expiration: moment().add(2, 'weeks').toISOString(),
          type: 'INPUT_ACTION',
          input_type: 'endpoint',
          agents: endpointData.map((endpt: HostMetadata) => endpt.elastic.agent.id),
          user_id: user!.username,
          timeout: 300, // 5 minutes
          data: {
            command: isolate ? 'isolate' : 'unisolate',
            comment: req.body.comment ?? undefined,
          },
        },
      });
    } catch (e) {
      return res.customError({
        statusCode: 500,
        body: { message: e },
      });
    }

    if (result.statusCode !== 201) {
      return res.customError({
        statusCode: 500,
        body: {
          message: result.body.result,
        },
      });
    }

    // Update all cases with a comment
    if (caseIDs.length > 0) {
      const targets = endpointData.map((endpt: HostMetadata) => ({
        hostname: endpt.host.hostname,
        endpointId: endpt.agent.id,
      }));

      await Promise.all(
        caseIDs.map((caseId) =>
          casesClient.attachments.add({
            caseId,
            comment: {
              type: CommentType.actions,
              comment: req.body.comment || '',
              actions: {
                targets,
                type: isolate ? 'isolate' : 'unisolate',
              },
              owner: APP_ID,
            },
          })
        )
      );
    }

    return res.ok({
      body: {
        action: actionID,
      },
    });
  };
};
