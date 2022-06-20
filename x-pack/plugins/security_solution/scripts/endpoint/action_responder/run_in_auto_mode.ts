/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext } from '@kbn/dev-cli-runner';
import { set } from 'lodash';
import { SUPPORTED_TOKENS } from './constants';
import { ActionDetails } from '../../../common/endpoint/types';
import { createRuntimeServices, RuntimeServices } from '../common/stack_services';

import {
  fetchEndpointActionList,
  sendEndpointActionResponse,
  sendFleetActionResponse,
  sleep,
} from './utils';

const ACTION_RESPONSE_DELAY = 40_000;

export const runInAutoMode = async ({
  log,
  flags: { username, password, asSuperuser, kibana, elastic, delay: _delay },
}: RunContext) => {
  const runtimeServices = await createRuntimeServices({
    log,
    password: password as string,
    username: username as string,
    asSuperuser: asSuperuser as boolean,
    elasticsearchUrl: elastic as string,
    kibanaUrl: kibana as string,
  });

  log.write(`  ${SUPPORTED_TOKENS}`);

  const delay = Number(_delay) || ACTION_RESPONSE_DELAY;

  do {
    await checkPendingActionsAndRespond(runtimeServices, { delay });
    await sleep(5_000);
  } while (true);
};

const checkPendingActionsAndRespond = async (
  { kbnClient, esClient, log }: RuntimeServices,
  { delay = ACTION_RESPONSE_DELAY }: { delay?: number } = {}
) => {
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
          if (Date.now() - new Date(action.startedAt).getTime() >= delay) {
            log.info(
              `[${new Date().toLocaleTimeString()}]: Responding to [${
                action.command
              }] action [id: ${action.id}] agent: [${action.agents.join(', ')}]`
            );

            const tokens = parseCommentTokens(getActionComment(action));

            log.verbose('tokens found in action:', tokens);

            const fleetResponse = await sendFleetActionResponse(esClient, action, {
              // If an Endpoint state token was found, then force the Fleet response to `success`
              // so that we can actually generate an endpoint response below.
              state: tokens.state ? 'success' : tokens.fleet.state,
            });

            // If not a fleet response error, then also sent the Endpoint Response
            if (!fleetResponse.error) {
              await sendEndpointActionResponse(esClient, action, { state: tokens.state });
            }
          }
        }
      }
    }
  } catch (e) {
    log.error(`${e.message}. Run with '--verbose' option to see more`);
    log.verbose(e);
  }
};

interface CommentTokens {
  state: 'success' | 'failure' | undefined;
  fleet: {
    state: 'success' | 'failure' | undefined;
  };
}

const parseCommentTokens = (comment: string): CommentTokens => {
  const response: CommentTokens = {
    state: undefined,
    fleet: {
      state: undefined,
    },
  };

  if (comment) {
    const findTokensRegExp = /(respond\.\S*=\S*)/gi;
    let matches;

    while ((matches = findTokensRegExp.exec(comment)) !== null) {
      const [key, value] = matches[0]
        .toLowerCase()
        .split('=')
        .map((s) => s.trim());

      set(response, key.split('.').slice(1), value);
    }
  }
  return response;
};

const getActionComment = (action: ActionDetails): string => {
  const actionRequest = action.logEntries.find(
    (entry) => entry.type === 'fleetAction' || entry.type === 'action'
  );

  if (actionRequest) {
    if (actionRequest.type === 'fleetAction') {
      return actionRequest.item.data.data.comment ?? '';
    }

    if (actionRequest.type === 'action') {
      return actionRequest.item.data.EndpointActions.data.comment ?? '';
    }
  }

  return '';
};
