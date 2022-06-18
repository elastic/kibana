/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext } from '@kbn/dev-cli-runner';
import {
  createRuntimeServices,
  fetchEndpointActionList,
  RuntimeServices,
  sendEndpointActionResponse,
  sendFleetActionResponse,
  sleep,
} from './utils';

const ACTION_RESPONSE_DELAY = 40_000;

export const runInAutoMode = async (context: RunContext) => {
  const runtimeServices = createRuntimeServices(context);

  do {
    await checkPendingActionsAndRespond(runtimeServices);
    await sleep(10_000);
  } while (true);
};

const checkPendingActionsAndRespond = async ({ kbnClient, esClient, log }: RuntimeServices) => {
  let hasMore = true;
  let nextPage = 1;

  try {
    while (hasMore) {
      const { data: actions } = await fetchEndpointActionList(kbnClient, {
        page: nextPage++,
        pageSize: 100,
      });

      if (actions.length === 0) {
        hasMore = false;
      }

      for (const action of actions) {
        if (action.isCompleted === false) {
          if (Date.now() - new Date(action.startedAt).getTime() >= ACTION_RESPONSE_DELAY) {
            log.info(
              `[${new Date().toLocaleTimeString()}]: Responding to [${
                action.command
              }] action [id: ${action.id} | agent: ${action.agents.join(', ')}]`
            );

            await sendFleetActionResponse(esClient, action);
            await sendEndpointActionResponse(esClient, action);
          }
        }
      }
    }
  } catch (e) {
    log.error(`${e.message}. Run with '--verbose' option to see more`);
    log.verbose(e);
  }
};
