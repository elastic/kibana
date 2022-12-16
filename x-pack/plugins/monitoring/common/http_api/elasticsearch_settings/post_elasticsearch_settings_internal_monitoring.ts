/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ccsRT } from '../shared';

export const postElasticsearchSettingsInternalMonitoringRequestPayloadRT = rt.partial({
  ccs: ccsRT,
});

export type PostElasticsearchSettingsInternalMonitoringRequestPayload = rt.TypeOf<
  typeof postElasticsearchSettingsInternalMonitoringRequestPayloadRT
>;

export const postElasticsearchSettingsInternalMonitoringResponsePayloadRT = rt.type({
  body: rt.type({
    legacy_indices: rt.number,
    mb_indices: rt.number,
  }),
});
