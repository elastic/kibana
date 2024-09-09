/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { filter, isEmpty, isNumber, map, omit, pick, pickBy, some } from 'lodash';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/api';
import { createDynamicQueries, replacedQueries } from './create_queries';
import { getInternalSavedObjectsClient } from '../../routes/utils';
import { parseAgentSelection } from '../../lib/parse_agent_groups';
import { packSavedObjectType } from '../../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { convertSOQueriesToPack } from '../../routes/pack/utils';
import { ACTIONS_INDEX, QUERY_TIMEOUT } from '../../../common/constants';
import { TELEMETRY_EBT_LIVE_QUERY_EVENT } from '../../lib/telemetry/constants';
import type { PackSavedObject } from '../../common/types';
import { CustomHttpRequestError } from '../../common/error';

interface Metadata {
  currentUser: string | undefined;
}

interface CreateActionHandlerOptions {
  soClient?: SavedObjectsClientContract;
  metadata?: Metadata;
  alertData?: ParsedTechnicalFields & { _index: string };
  error?: string;
}

export const createActionHandler = async (
  osqueryContext: OsqueryAppContext,
  params: CreateLiveQueryRequestBodySchema,
  options: CreateActionHandlerOptions
) => {
  const [coreStartServices] = await osqueryContext.getStartServices();
  const esClientInternal = coreStartServices.elasticsearch.client.asInternalUser;
  const internalSavedObjectsClient = await getInternalSavedObjectsClient(
    osqueryContext.getStartServices
  );

  const { soClient, metadata, alertData, error } = options;
  const savedObjectsClient = soClient ?? coreStartServices.savedObjects.createInternalRepository();
  const elasticsearchClient = coreStartServices.elasticsearch.client.asInternalUser;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { agent_all, agent_ids, agent_platforms, agent_policy_ids } = params;
  const selectedAgents = await parseAgentSelection(
    internalSavedObjectsClient,
    elasticsearchClient,
    osqueryContext,
    {
      agents: agent_ids,
      allAgentsSelected: !!agent_all,
      platformsSelected: agent_platforms,
      policiesSelected: agent_policy_ids,
    }
  );

  if (!selectedAgents.length) {
    throw new CustomHttpRequestError('No agents found for selection', 400);
  }

  let packSO;

  if (params.pack_id) {
    packSO = await savedObjectsClient.get<PackSavedObject>(packSavedObjectType, params.pack_id);
  }

  const osqueryAction = {
    action_id: uuidv4(),
    '@timestamp': moment().toISOString(),
    expiration: moment().add(5, 'minutes').toISOString(),
    type: 'INPUT_ACTION',
    input_type: 'osquery',
    alert_ids: params.alert_ids,
    event_ids: params.event_ids,
    case_ids: params.case_ids,
    agent_ids: params.agent_ids,
    agent_all: params.agent_all,
    agent_platforms: params.agent_platforms,
    agent_policy_ids: params.agent_policy_ids,
    agents: selectedAgents,
    user_id: metadata?.currentUser,
    metadata: params.metadata,
    pack_id: params.pack_id,
    pack_name: packSO?.attributes?.name,
    pack_prebuilt: params.pack_id
      ? some(packSO?.references, ['type', 'osquery-pack-asset'])
      : undefined,
    queries: packSO
      ? map(convertSOQueriesToPack(packSO.attributes.queries), (packQuery, packQueryId) => {
          const replacedQuery = replacedQueries(packQuery.query, alertData);

          return pickBy(
            {
              action_id: uuidv4(),
              id: packQueryId,
              ...replacedQuery,
              ...(error ? { error } : {}),
              ecs_mapping: packQuery.ecs_mapping,
              version: packQuery.version,
              platform: packQuery.platform,
              timeout: packQuery.timeout,
              agents: selectedAgents,
            },
            (value) => !isEmpty(value) || isNumber(value)
          );
        })
      : await createDynamicQueries({
          params,
          alertData,
          agents: selectedAgents,
          osqueryContext,
          error,
        }),
  };

  const fleetActions = !error
    ? map(
        filter(osqueryAction.queries, (query) => !query.error),
        (query) => ({
          action_id: query.action_id,
          '@timestamp': moment().toISOString(),
          expiration: moment().add(5, 'minutes').toISOString(),
          type: 'INPUT_ACTION',
          input_type: 'osquery',
          agents: query.agents,
          user_id: metadata?.currentUser,
          ...(query.timeout !== QUERY_TIMEOUT.DEFAULT ? { timeout: query.timeout } : {}),
          data: pick(query, ['id', 'query', 'ecs_mapping', 'version', 'platform']),
        })
      )
    : [];

  if (fleetActions.length) {
    await osqueryContext.service.getFleetActionsClient()?.bulkCreate(fleetActions);
  }

  const actionsComponentTemplateExists = await esClientInternal.indices.exists({
    index: `${ACTIONS_INDEX}*`,
  });

  if (actionsComponentTemplateExists) {
    await esClientInternal.bulk({
      refresh: 'wait_for',
      operations: [{ index: { _index: `${ACTIONS_INDEX}-default` } }, osqueryAction],
    });
  }

  osqueryContext.telemetryEventsSender.reportEvent(TELEMETRY_EBT_LIVE_QUERY_EVENT, {
    ...omit(osqueryAction, ['type', 'input_type', 'user_id', 'error']),
    agents: osqueryAction.agents.length,
  });

  return {
    response: osqueryAction,
    fleetActionsCount: fleetActions.length,
  };
};
