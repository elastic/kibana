/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlRoutes } from './esql/route';
import { enableStreamsRoute } from './streams/enable';
import { forkStreamsRoute } from './streams/fork';
import { listStreamsRoute } from './streams/list';
import { readStreamRoute } from './streams/read';
import { streamsSettingsRoutes } from './streams/settings';

export const StreamsRouteRepository = {
  ...enableStreamsRoute,
  ...forkStreamsRoute,
  ...readStreamRoute,
  ...listStreamsRoute,
  ...esqlRoutes,
  ...streamsSettingsRoutes,
};

export type StreamsRouteRepository = typeof StreamsRouteRepository;
