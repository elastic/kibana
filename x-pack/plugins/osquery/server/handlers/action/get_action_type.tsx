/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curry, uniq } from 'lodash';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { osqueryActionTypeBase } from '../../../common/actions/osquery_type';
import { createActionHandler } from './create_action_handler';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

interface IAlert {
  agent?: {
    id: string;
  };
}

export const getOsqueryActionType = (osqueryContext: OsqueryAppContext) => ({
  ...osqueryActionTypeBase,
  executor: curry(executor)({
    osqueryContext,
  }),
});

// @ts-expect-error update types
async function executor(payload, execOptions): Promise<ActionTypeExecutorResult<unknown>> {
  const { query, ecs_mapping: ecsMapping, alerts, id } = execOptions.params;

  const parsedAlerts: IAlert[] = JSON.parse(alerts);

  const agentIds = uniq(parsedAlerts.map((alert) => alert.agent?.id));

  const [coreStartServices] = await payload.osqueryContext.getStartServices();

  const esClientInternal = coreStartServices.elasticsearch.client.asInternalUser;

  const response = await createActionHandler(
    esClientInternal,
    execOptions.services.savedObjectsClient,
    {
      agents: agentIds,
      query: {
        id,
        query,
        ecs_mapping: ecsMapping,
      },
    }
  );

  return { status: 'ok', data: response, actionId: execOptions.actionId };
}
