/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import moment from 'moment';
import {
  ENDPOINT_ACTIONS_DS,
  ENDPOINT_ACTIONS_INDEX,
  ENDPOINT_ACTION_RESPONSES_DS,
  failedFleetActionErrorCode,
} from '../../../../../common/endpoint/constants';
import type {
  EndpointAction,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../../common/endpoint/types';
import type { EndpointAppContext } from '../../../types';
import { doLogsEndpointActionDsExists } from '../../../utils';
import type { CreateActionPayload } from './types';

export const writeActionToIndices = async ({
  agents,
  doc,
  esClient,
  endpointContext,
  logger,
  payload,
}: {
  agents: string[];
  doc: LogsEndpointAction;
  esClient: ElasticsearchClient;
  endpointContext: EndpointAppContext;
  logger: Logger;
  payload: CreateActionPayload;
}): Promise<void> => {
  // if .logs-endpoint.actions data stream exists
  // try to create action request record in .logs-endpoint.actions DS as the current user
  // (from >= v7.16, use this check to ensure the current user has privileges to write to the new index)
  // and allow only users with superuser privileges to write to fleet indices
  // const logger = endpointContext.logFactory.get('host-isolation');
  const doesLogsEndpointActionsDsExist = await doLogsEndpointActionDsExists({
    esClient,
    logger,
    dataStreamName: ENDPOINT_ACTIONS_DS,
  });

  // if the new endpoint indices/data streams exists
  // write the action request to the new endpoint index
  if (doesLogsEndpointActionsDsExist) {
    const logsEndpointActionsResult = await esClient.index<LogsEndpointAction>(
      {
        index: ENDPOINT_ACTIONS_INDEX,
        body: {
          ...doc,
          agent: {
            id: payload.endpoint_ids,
          },
        },
        refresh: 'wait_for',
      },
      { meta: true }
    );
    if (logsEndpointActionsResult.statusCode !== 201) {
      throw new Error(logsEndpointActionsResult.body.result);
    }
  }

  if (!doc.error) {
    // add signature to doc
    const fleetActionDoc = {
      ...doc.EndpointActions,
      '@timestamp': doc['@timestamp'],
      agents,
      timeout: 300, // 5 minutes
      user_id: doc.user.id,
    };
    const fleetActionDocSignature = await endpointContext.service
      .getMessageSigningService()
      .sign(fleetActionDoc);
    const signedFleetActionDoc = {
      ...fleetActionDoc,
      signed: {
        data: fleetActionDocSignature.data.toString('base64'),
        signature: fleetActionDocSignature.signature,
      },
    };
    // write actions to .fleet-actions index
    try {
      const fleetActionIndexResult = await esClient.index<EndpointAction>(
        {
          index: AGENT_ACTIONS_INDEX,
          body: signedFleetActionDoc,
          refresh: 'wait_for',
        },
        {
          meta: true,
        }
      );

      if (fleetActionIndexResult.statusCode !== 201) {
        throw new Error(fleetActionIndexResult.body.result);
      }
    } catch (e) {
      // create entry in .logs-endpoint.action.responses-default data stream
      // when writing to .fleet-actions fails
      if (doesLogsEndpointActionsDsExist) {
        await createFailedActionResponseEntry({
          esClient,
          doc: {
            '@timestamp': moment().toISOString(),
            agent: doc.agent,
            EndpointActions: {
              action_id: doc.EndpointActions.action_id,
              completed_at: moment().toISOString(),
              started_at: moment().toISOString(),
              data: doc.EndpointActions.data,
            },
          },
          logger,
        });
      }

      throw e;
    }
  }
};

const createFailedActionResponseEntry = async ({
  esClient,
  doc,
  logger,
}: {
  esClient: ElasticsearchClient;
  doc: LogsEndpointActionResponse;
  logger: Logger;
}): Promise<void> => {
  try {
    await esClient.index<LogsEndpointActionResponse>({
      index: `${ENDPOINT_ACTION_RESPONSES_DS}-default`,
      body: {
        ...doc,
        error: {
          code: failedFleetActionErrorCode,
          message: 'Failed to deliver action request to fleet',
        },
      },
    });
  } catch (e) {
    logger.error(e);
  }
};
