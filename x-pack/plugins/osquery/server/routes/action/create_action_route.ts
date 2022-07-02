/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { some, flatten, map, pick, pickBy, isEmpty } from 'lodash';
import uuid from 'uuid';
import moment from 'moment-timezone';

import { IRouter } from '@kbn/core/server';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

import { parseAgentSelection, AgentSelection } from '../../lib/parse_agent_groups';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import {
  createActionRequestBodySchema,
  CreateActionRequestBodySchema,
} from '../../../common/schemas/routes/action/create_action_request_body_schema';

import { incrementCount } from '../usage';
import { getInternalSavedObjectsClient } from '../../usage/collector';
import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';
import { ACTIONS_INDEX } from '../../../common/constants';
import { convertSOQueriesToPack } from '../pack/utils';
import { PackSavedObjectAttributes } from '../../common/types';
import { TELEMETRY_CHANNEL_LIVE_QUERIES } from '../../lib/telemetry/constants';

export const createActionRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/internal/osquery/action',
      validate: {
        body: buildRouteValidation<
          typeof createActionRequestBodySchema,
          CreateActionRequestBodySchema
        >(createActionRequestBodySchema),
      },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asInternalUser;
      const soClient = coreContext.savedObjects.client;
      const internalSavedObjectsClient = await getInternalSavedObjectsClient(
        osqueryContext.getStartServices
      );
      const [coreStartServices] = await osqueryContext.getStartServices();
      let savedQueryId = request.body.saved_query_id;

      const {
        osquery: { writeLiveQueries, runSavedQueries },
      } = await coreStartServices.capabilities.resolveCapabilities(request);

      const isInvalid = !(writeLiveQueries || (runSavedQueries && request.body.saved_query_id));

      if (isInvalid) {
        return response.forbidden();
      }

      if (request.body.saved_query_id && runSavedQueries) {
        const savedQueries = await soClient.find({
          type: savedQuerySavedObjectType,
        });
        const actualSavedQuery = savedQueries.saved_objects.find(
          (savedQuery) => savedQuery.id === request.body.saved_query_id
        );

        if (actualSavedQuery) {
          savedQueryId = actualSavedQuery.id;
        }
      }

      const { agentSelection } = request.body as { agentSelection: AgentSelection };
      const selectedAgents = await parseAgentSelection(
        internalSavedObjectsClient,
        osqueryContext,
        agentSelection
      );
      incrementCount(internalSavedObjectsClient, 'live_query');
      if (!selectedAgents.length) {
        incrementCount(internalSavedObjectsClient, 'live_query', 'errors');

        return response.badRequest({ body: new Error('No agents found for selection') });
      }

      try {
        const currentUser = await osqueryContext.security.authc.getCurrentUser(request)?.username;

        let packSO;

        if (request.body.pack_id) {
          packSO = await soClient.get<PackSavedObjectAttributes>(
            packSavedObjectType,
            request.body.pack_id
          );
        }

        const osqueryAction = {
          action_id: uuid.v4(),
          '@timestamp': moment().toISOString(),
          expiration: moment().add(5, 'minutes').toISOString(),
          type: 'INPUT_ACTION',
          input_type: 'osquery',
          alert_ids: request.body.alert_ids,
          event_ids: request.body.event_ids,
          case_ids: request.body.case_ids,
          agent_selection: agentSelection,
          execution_context: request.body.execution_context,
          user_id: currentUser,
          saved_query_id: savedQueryId,
          // TODO: add condition
          saved_query_prebuilt: false,
          pack_id: request.body.pack_id,
          pack_name: packSO?.attributes?.name,
          pack_prebuilt: !!(packSO
            ? some(packSO?.references, ['type', 'osquery-pack-asset'])
            : undefined),
          queries: packSO
            ? map(convertSOQueriesToPack(packSO.attributes.queries), (packQuery, packQueryId) =>
                pickBy(
                  {
                    action_id: uuid.v4(),
                    id: packQueryId,
                    query: packQuery.query,
                    ecs_mapping: packQuery.ecs_mapping,
                    version: packQuery.version,
                    platform: packQuery.platform,
                    agents: selectedAgents,
                  },
                  (value) => !isEmpty(value)
                )
              )
            : [
                pickBy(
                  {
                    action_id: uuid.v4(),
                    id: uuid.v4(),
                    query: request.body.query,
                    saved_query_id: savedQueryId,
                    ecs_mapping: request.body.ecs_mapping,
                    agents: selectedAgents,
                  },
                  (value) => !isEmpty(value)
                ),
              ],
        };

        const fleetActions = map(osqueryAction.queries, (query) => ({
          action_id: query.action_id,
          '@timestamp': moment().toISOString(),
          expiration: moment().add(5, 'minutes').toISOString(),
          type: 'INPUT_ACTION',
          input_type: 'osquery',
          agents: query.agents,
          user_id: currentUser,
          data: pick(query, ['id', 'query', 'ecs_mapping', 'version', 'platform']),
        }));

        let actionResponse = await esClient.bulk({
          refresh: 'wait_for',
          body: flatten(
            fleetActions.map((action) => [{ index: { _index: AGENT_ACTIONS_INDEX } }, action])
          ),
        });

        const actionsComponentTemplateExists = await esClient.indices.exists({
          index: `${ACTIONS_INDEX}*`,
        });

        if (actionsComponentTemplateExists) {
          actionResponse = await esClient.bulk({
            refresh: 'wait_for',
            body: [{ index: { _index: `${ACTIONS_INDEX}-default` } }, osqueryAction],
          });
        }

        const telemetryOptIn = await osqueryContext.telemetryEventsSender.isTelemetryOptedIn();

        if (telemetryOptIn) {
          osqueryContext.telemetryEventsSender.sendOnDemand(TELEMETRY_CHANNEL_LIVE_QUERIES, [
            osqueryAction,
          ]);
        }

        return response.ok({
          body: {
            response: actionResponse,
            actions: [osqueryAction],
          },
        });
      } catch (error) {
        incrementCount(internalSavedObjectsClient, 'live_query', 'errors');

        return response.customError({
          statusCode: 500,
          body: new Error(`Error occurred while processing ${error}`),
        });
      }
    }
  );
};
