/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@kbn/inspector-plugin/common';

export type ObservabilityApp =
  | 'infra_metrics'
  | 'infra_logs'
  | 'apm'
  // we will remove uptime in future to replace to be replace by synthetics
  | 'uptime'
  | 'synthetics'
  | 'observability-overview'
  | 'stack_monitoring'
  | 'ux'
  | 'fleet'
  | 'universal_profiling';

export type { Coordinates } from '../public/typings/fetch_overview_data';

export type InspectResponse = Request[];
