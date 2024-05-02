/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SentinelOneDataGenerator } from '../../../../../../common/endpoint/data_generators/sentinelone_data_generator';
import { buildSentinelOneRoutePath } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

const generator = new SentinelOneDataGenerator();

export const getActivitiesRouteDefinition = (): EmulatorServerRouteDefinition => {
  return {
    path: buildSentinelOneRoutePath('/activities'),
    method: 'GET',
    handler: activitiesRouteHandler,
  };
};

const activitiesRouteHandler: ExternalEdrServerEmulatorRouteHandlerMethod = async (request) => {
  return generator.generateSentinelOneApiActivityResponse();
};
