/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteStreamRoute } from './streams/delete';
import { editStreamRoute } from './streams/edit';
import { enableStreamsRoute } from './streams/enable';
import { forkStreamsRoute } from './streams/fork';
import { listStreamsRoute } from './streams/list';
import { readStreamRoute } from './streams/read';
import { resyncStreamsRoute } from './streams/resync';

export const StreamsRouteRepository = {
  ...enableStreamsRoute,
  ...resyncStreamsRoute,
  ...forkStreamsRoute,
  ...readStreamRoute,
  ...editStreamRoute,
  ...deleteStreamRoute,
  ...listStreamsRoute,
};

export type StreamsRouteRepository = typeof StreamsRouteRepository;
