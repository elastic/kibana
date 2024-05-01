/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Core services that will be made available to all emulator plugin routes via `Request.pre.services`.
 *
 * **NOTE**:  Only services that are emulator agnostic should be added here. Any service that is specific
 *            for only a given emulator should instead be added to the route registration via
 *            `route.options.pre`. See {@link https://hapi.dev/api/?v=21.3.3#-routeoptionspre|Hapi Route Options}
 *            for more on how to use `pre`requisites option
 */
export interface ExternalEdrServerEmulatorCoreServices {
  readonly kbnClient: KbnClient;
  readonly esClient: Client;
  readonly logger: ToolingLog;
}
