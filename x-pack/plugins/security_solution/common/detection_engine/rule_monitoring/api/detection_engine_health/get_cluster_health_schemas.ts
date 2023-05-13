/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';
import type { HealthInterval } from '../../model/detection_engine_health/health_interval';
import { HealthIntervalParameters } from '../../model/detection_engine_health/health_interval';
import type { HealthTimings } from '../../model/detection_engine_health/health_metadata';
import type {
  ClusterHealthParameters,
  ClusterHealthSnapshot,
} from '../../model/detection_engine_health/cluster_health';

export type GetClusterHealthRequestBody = t.TypeOf<typeof GetClusterHealthRequestBody>;
export const GetClusterHealthRequestBody = t.exact(
  t.partial({
    interval: HealthIntervalParameters,
    debug: t.boolean,
  })
);

export interface GetClusterHealthRequest {
  interval: HealthInterval;
  debug: boolean;
  requestReceivedAt: IsoDateString;
}

export interface GetClusterHealthResponse {
  // TODO: https://github.com/elastic/kibana/issues/125642 Implement and remove the property
  message: 'Not implemented';
  timings: HealthTimings;
  parameters: ClusterHealthParameters;
  health: ClusterHealthSnapshot;
}
