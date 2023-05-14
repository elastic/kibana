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
  SpaceHealthParameters,
  SpaceHealthSnapshot,
} from '../../model/detection_engine_health/space_health';

export type GetSpaceHealthRequestBody = t.TypeOf<typeof GetSpaceHealthRequestBody>;
export const GetSpaceHealthRequestBody = t.exact(
  t.partial({
    interval: HealthIntervalParameters,
    debug: t.boolean,
  })
);

export interface GetSpaceHealthRequest {
  interval: HealthInterval;
  debug: boolean;
  requestReceivedAt: IsoDateString;
}

export interface GetSpaceHealthResponse {
  timings: HealthTimings;
  parameters: SpaceHealthParameters;
  health: SpaceHealthSnapshot;
}
