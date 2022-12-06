/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import moment from 'moment';
import { flatten, isEmpty, map, omit, pick, pickBy, some } from 'lodash';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { getInternalSavedObjectsClient } from '../../routes/utils';
import { parseAgentSelection } from '../../lib/parse_agent_groups';
import { packSavedObjectType } from '../../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/schemas/routes/live_query';
import { convertSOQueriesToPack } from '../../routes/pack/utils';
import { isSavedQueryPrebuilt } from '../../routes/saved_query/utils';
import { ACTIONS_INDEX } from '../../../common/constants';
import { TELEMETRY_EBT_LIVE_QUERY_EVENT } from '../../lib/telemetry/constants';
import type { PackSavedObjectAttributes } from '../../common/types';

interface Metadata {
  currentUser: string | undefined;
}

export const createActionHandler = async (
  osqueryContext: OsqueryAppContext,
  params: CreateLiveQueryRequestBodySchema,
  soClient?: SavedObjectsClientContract,
  metadata?: Metadata
) => {
  const [coreStartServices] = await osqueryContext.getStartServices();
  const esClientInternal = coreStartServices.elasticsearch.client.asInternalUser;
  const internalSavedObjectsClient = await getInternalSavedObjectsClient(
    osqueryContext.getStartServices
  );
  const savedObjectsClient = soClient ?? coreStartServices.savedObjects.createInternalRepository();

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { agent_all, agent_ids, agent_platforms, agent_policy_ids } = params;
  const selectedAgents = await parseAgentSelection(internalSavedObjectsClient, osqueryContext, {
    agents: agent_ids,
    allAgentsSelected: !!agent_all,
    platformsSelected: agent_platforms,
    policiesSelected: agent_policy_ids,
  });
  if (!selectedAgents.length) {
    throw new Error('No agents found for selection');
  }

  let packSO;

  if (params.pack_id) {
    packSO = await savedObjectsClient.get<PackSavedObjectAttributes>(
      packSavedObjectType,
      params.pack_id
    );
  }

  const osqueryAction = {
    action_id: uuid.v4(),
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
      : params.queries?.length
      ? map(params.queries, (query) =>
          pickBy(
            {
              // @ts-expect-error where does type 'number' comes from?
              ...query,
              action_id: uuid.v4(),
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
              query: params.query,
              saved_query_id: params.saved_query_id,
              saved_query_prebuilt: params.saved_query_id
                ? await isSavedQueryPrebuilt(
                    osqueryContext.service.getPackageService()?.asInternalUser,
                    params.saved_query_id
                  )
                : undefined,
              ecs_mapping: params.ecs_mapping,
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
    user_id: metadata?.currentUser,
    data: pick(query, ['id', 'query', 'ecs_mapping', 'version', 'platform']),
  }));

  await esClientInternal.bulk({
    refresh: 'wait_for',
    body: flatten(
      fleetActions.map((action) => [{ index: { _index: AGENT_ACTIONS_INDEX } }, action])
    ),
  });

  const actionsComponentTemplateExists = await esClientInternal.indices.exists({
    index: `${ACTIONS_INDEX}*`,
  });

  if (actionsComponentTemplateExists) {
    await esClientInternal.bulk({
      refresh: 'wait_for',
      body: [{ index: { _index: `${ACTIONS_INDEX}-default` } }, osqueryAction],
    });
  }

  osqueryContext.telemetryEventsSender.reportEvent(TELEMETRY_EBT_LIVE_QUERY_EVENT, {
    ...omit(osqueryAction, ['type', 'input_type', 'user_id']),
    agents: osqueryAction.agents.length,
  });

  return {
    response: osqueryAction,
  };
};
