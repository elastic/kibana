/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SentinelOneGetAgentsParams,
  SentinelOneGetAgentsResponse,
} from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import type { DeepPartial, Mutable } from 'utility-types';
import { SentinelOneDataGenerator } from '../../../../../../common/endpoint/data_generators/sentinelone_data_generator';
import { buildSentinelOneRoutePath } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

const generator = new SentinelOneDataGenerator();

export const getAgentsRouteDefinition = (): EmulatorServerRouteDefinition => {
  return {
    path: buildSentinelOneRoutePath('/agents'),
    method: 'GET',
    handler: agentsRouteHandler,
  };
};

const agentsRouteHandler: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  SentinelOneGetAgentsParams
> = async (request) => {
  const queryParams = request.query;
  const agent: Mutable<DeepPartial<SentinelOneGetAgentsResponse['data'][number]>> = {};

  if (queryParams.uuid) {
    agent.uuid = queryParams.uuid;
  }

  if (queryParams.ids) {
    agent.id = queryParams.ids.split(',').at(0);
  }

  return generator.generateSentinelOneApiAgentsResponse(agent);
};
