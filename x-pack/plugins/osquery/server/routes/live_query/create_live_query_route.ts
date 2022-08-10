/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { some, flatten, map, pick, pickBy, isEmpty, omit } from 'lodash';
import uuid from 'uuid';
import moment from 'moment-timezone';

import type { IRouter } from '@kbn/core/server';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

import { parseAgentSelection } from '../../lib/parse_agent_groups';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/schemas/routes/live_query';
import { createLiveQueryRequestBodySchema } from '../../../common/schemas/routes/live_query';

import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';
import { ACTIONS_INDEX } from '../../../common/constants';
import { convertSOQueriesToPack } from '../pack/utils';
import type { PackSavedObjectAttributes } from '../../common/types';
import { TELEMETRY_EBT_LIVE_QUERY_EVENT } from '../../lib/telemetry/constants';
import { isSavedQueryPrebuilt } from '../saved_query/utils';
import { getInternalSavedObjectsClient } from '../utils';

export const createLiveQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/api/osquery/live_queries',
      validate: {
        body: buildRouteValidation<
          typeof createLiveQueryRequestBodySchema,
          CreateLiveQueryRequestBodySchema
        >(createLiveQueryRequestBodySchema),
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

      const isInvalid = !(
        writeLiveQueries ||
        (runSavedQueries && (request.body.saved_query_id || request.body.pack_id))
      );

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

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { agent_all, agent_ids, agent_platforms, agent_policy_ids } = request.body;
      const selectedAgents = await parseAgentSelection(internalSavedObjectsClient, osqueryContext, {
        agents: agent_ids,
        allAgentsSelected: !!agent_all,
        platformsSelected: agent_platforms,
        policiesSelected: agent_policy_ids,
      });
      if (!selectedAgents.length) {
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
          agent_ids: request.body.agent_ids,
          agent_all: request.body.agent_all,
          agent_platforms: request.body.agent_platforms,
          agent_policy_ids: request.body.agent_policy_ids,
          agents: selectedAgents,
          user_id: currentUser,
          metadata: request.body.metadata,
          pack_id: request.body.pack_id,
          pack_name: packSO?.attributes?.name,
          pack_prebuilt: request.body.pack_id
            ? !!some(packSO?.references, ['type', 'osquery-pack-asset'])
            : undefined,
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
                    saved_query_prebuilt: savedQueryId
                      ? await isSavedQueryPrebuilt(
                          osqueryContext.service.getPackageService()?.asInternalUser,
                          savedQueryId
                        )
                      : undefined,
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

        await esClient.bulk({
          refresh: 'wait_for',
          body: flatten(
            fleetActions.map((action) => [{ index: { _index: AGENT_ACTIONS_INDEX } }, action])
          ),
        });

        const actionsComponentTemplateExists = await esClient.indices.exists({
          index: `${ACTIONS_INDEX}*`,
        });

        if (actionsComponentTemplateExists) {
          await esClient.bulk({
            refresh: 'wait_for',
            body: [{ index: { _index: `${ACTIONS_INDEX}-default` } }, osqueryAction],
          });
        }

        osqueryContext.telemetryEventsSender.reportEvent(TELEMETRY_EBT_LIVE_QUERY_EVENT, {
          ...omit(osqueryAction, ['type', 'input_type', 'user_id']),
          agents: osqueryAction.agents.length,
        });

        return response.ok({
          body: { data: osqueryAction },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: new Error(`Error occurred while processing ${error}`),
        });
      }
    }
  );
};
