/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { editStreamRoute } from './streams/edit';
import { enableStreamsRoute } from './streams/enable';
import { forkStreamsRoute } from './streams/fork';
import { readStreamRoute } from './streams/read';

export const StreamsRouteRepository = {
  ...enableStreamsRoute,
  ...forkStreamsRoute,
  ...readStreamRoute,
  ...editStreamRoute,
};

export type StreamsRouteRepository = typeof StreamsRouteRepository;
