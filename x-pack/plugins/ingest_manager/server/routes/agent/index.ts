/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, RouteValidationResultFactory } from 'src/core/server';
import Ajv from 'ajv';
import { PLUGIN_ID, AGENT_API_ROUTES, LIMITED_CONCURRENCY_ROUTE_TAG } from '../../constants';
import {
  GetAgentsRequestSchema,
  GetOneAgentRequestSchema,
  GetOneAgentEventsRequestSchema,
  UpdateAgentRequestSchema,
  DeleteAgentRequestSchema,
  PostAgentCheckinRequestBodyJSONSchema,
  PostAgentCheckinRequestParamsJSONSchema,
  PostAgentAcksRequestParamsJSONSchema,
  PostAgentAcksRequestBodyJSONSchema,
  PostAgentUnenrollRequestSchema,
  GetAgentStatusRequestSchema,
  PostNewAgentActionRequestSchema,
  PutAgentReassignRequestSchema,
  PostAgentEnrollRequestBodyJSONSchema,
  PostAgentUpgradeRequestSchema,
} from '../../types';
import {
  getAgentsHandler,
  getAgentHandler,
  updateAgentHandler,
  deleteAgentHandler,
  getAgentEventsHandler,
  postAgentCheckinHandler,
  postAgentEnrollHandler,
  getAgentStatusForAgentPolicyHandler,
  putAgentsReassignHandler,
} from './handlers';
import { postAgentAcksHandlerBuilder } from './acks_handlers';
import * as AgentService from '../../services/agents';
import { postNewAgentActionHandlerBuilder } from './actions_handlers';
import { appContextService } from '../../services';
import { postAgentsUnenrollHandler } from './unenroll_handler';
import { IngestManagerConfigType } from '../..';
import { postAgentUpgradeHandler } from './upgrade_handler';

const ajv = new Ajv({
  coerceTypes: true,
  useDefaults: true,
  removeAdditional: true,
  allErrors: false,
  nullable: true,
});

function schemaErrorsText(errors: Ajv.ErrorObject[], dataVar: any) {
  return errors.map((e) => `${dataVar + (e.dataPath || '')} ${e.message}`).join(', ');
}

function makeValidator(jsonSchema: any) {
  const validator = ajv.compile(jsonSchema);
  return function validateWithAJV(data: any, r: RouteValidationResultFactory) {
    if (validator(data)) {
      return r.ok(data);
    }

    return r.badRequest(schemaErrorsText(validator.errors || [], data));
  };
}

export const registerRoutes = (router: IRouter, config: IngestManagerConfigType) => {
  // Get one
  router.get(
    {
      path: AGENT_API_ROUTES.INFO_PATTERN,
      validate: GetOneAgentRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getAgentHandler
  );
  // Update
  router.put(
    {
      path: AGENT_API_ROUTES.UPDATE_PATTERN,
      validate: UpdateAgentRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    updateAgentHandler
  );
  // Delete
  router.delete(
    {
      path: AGENT_API_ROUTES.DELETE_PATTERN,
      validate: DeleteAgentRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    deleteAgentHandler
  );
  // List
  router.get(
    {
      path: AGENT_API_ROUTES.LIST_PATTERN,
      validate: GetAgentsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getAgentsHandler
  );

  const pollingRequestTimeout = config.fleet.pollingRequestTimeout;
  // Agent checkin
  router.post(
    {
      path: AGENT_API_ROUTES.CHECKIN_PATTERN,
      validate: {
        params: makeValidator(PostAgentCheckinRequestParamsJSONSchema),
        body: makeValidator(PostAgentCheckinRequestBodyJSONSchema),
      },
      options: {
        tags: [],
        ...(pollingRequestTimeout
          ? {
              timeout: {
                idleSocket: pollingRequestTimeout,
              },
            }
          : {}),
      },
    },
    postAgentCheckinHandler
  );

  // Agent enrollment
  router.post(
    {
      path: AGENT_API_ROUTES.ENROLL_PATTERN,
      validate: {
        body: makeValidator(PostAgentEnrollRequestBodyJSONSchema),
      },
      options: { tags: [LIMITED_CONCURRENCY_ROUTE_TAG] },
    },
    postAgentEnrollHandler
  );

  // Agent acks
  router.post(
    {
      path: AGENT_API_ROUTES.ACKS_PATTERN,
      validate: {
        params: makeValidator(PostAgentAcksRequestParamsJSONSchema),
        body: makeValidator(PostAgentAcksRequestBodyJSONSchema),
      },
      options: { tags: [LIMITED_CONCURRENCY_ROUTE_TAG] },
    },
    postAgentAcksHandlerBuilder({
      acknowledgeAgentActions: AgentService.acknowledgeAgentActions,
      authenticateAgentWithAccessToken: AgentService.authenticateAgentWithAccessToken,
      getSavedObjectsClientContract: appContextService.getInternalUserSOClient.bind(
        appContextService
      ),
      saveAgentEvents: AgentService.saveAgentEvents,
    })
  );

  // Agent actions
  router.post(
    {
      path: AGENT_API_ROUTES.ACTIONS_PATTERN,
      validate: PostNewAgentActionRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postNewAgentActionHandlerBuilder({
      getAgent: AgentService.getAgent,
      createAgentAction: AgentService.createAgentAction,
    })
  );

  router.post(
    {
      path: AGENT_API_ROUTES.UNENROLL_PATTERN,
      validate: PostAgentUnenrollRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postAgentsUnenrollHandler
  );

  router.put(
    {
      path: AGENT_API_ROUTES.REASSIGN_PATTERN,
      validate: PutAgentReassignRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    putAgentsReassignHandler
  );

  // Get agent events
  router.get(
    {
      path: AGENT_API_ROUTES.EVENTS_PATTERN,
      validate: GetOneAgentEventsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getAgentEventsHandler
  );

  // Get agent status for policy
  router.get(
    {
      path: AGENT_API_ROUTES.STATUS_PATTERN,
      validate: GetAgentStatusRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getAgentStatusForAgentPolicyHandler
  );

  router.post(
    {
      path: AGENT_API_ROUTES.UPGRADE_PATTERN,
      validate: PostAgentUpgradeRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postAgentUpgradeHandler
  );
};
