/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ResponseActionsApiCommandNames } from '../../../../../common/endpoint/service/response_actions/constants';

import type {
  ActionDetails,
  EndpointActionDataParameterTypes,
  HostMetadata,
  EndpointActionResponseDataOutput,
} from '../../../../../common/endpoint/types';
import type { EndpointAppContext } from '../../../types';
import { getActionDetailsById } from '..';
import type { ActionCreateService, CreateActionMetadata, CreateActionPayload } from './types';
import { writeActionToIndices } from './write_action_to_indices';

const returnActionIdCommands: ResponseActionsApiCommandNames[] = ['isolate', 'unisolate'];

export const actionCreateService = (
  esClient: ElasticsearchClient,
  endpointContext: EndpointAppContext
): ActionCreateService => {
  const createAction = async <
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
  >(
    payload: CreateActionPayload,
    agents: string[],
    { minimumLicenseRequired = 'basic' }: CreateActionMetadata = {}
  ): Promise<ActionDetails<TOutputContent, TParameters>> => {
    const usageService = endpointContext.service.getFeatureUsageService();
    const featureKey = usageService.getResponseActionFeatureKey(payload.command);

    if (featureKey) {
      usageService.notifyUsage(featureKey);
    }

    // create an Action ID and use that to dispatch action to ES & Fleet Server
    const actionID = uuidv4();

    await writeActionToIndices({
      actionID,
      agents,
      esClient,
      endpointContext,
      minimumLicenseRequired,
      payload,
    });

    const actionId = returnActionIdCommands.includes(payload.command) ? { action: actionID } : {};
    const data = await getActionDetailsById(
      esClient,
      endpointContext.service.getEndpointMetadataService(),
      actionID
    );

    return {
      ...actionId,
      ...data,
    } as ActionDetails<TOutputContent, TParameters>;
  };

  return {
    createAction,
    createActionFromAlert: async (payload) => {
      const endpointData = await endpointContext.service
        .getEndpointMetadataService()
        .getMetadataForEndpoints(esClient, [...new Set(payload.endpoint_ids)]);
      const agentIds = endpointData.map((endpoint: HostMetadata) => endpoint.elastic.agent.id);
      return createAction(payload, agentIds, { minimumLicenseRequired: 'enterprise' });
    },
  };
};
