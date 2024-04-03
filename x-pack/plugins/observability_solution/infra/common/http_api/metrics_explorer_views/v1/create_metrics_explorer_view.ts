/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  metricsExplorerViewAttributesRT,
  metricsExplorerViewRT,
} from '../../../metrics_explorer_views';

export const createMetricsExplorerViewAttributesRequestPayloadRT = rt.intersection([
  metricsExplorerViewAttributesRT,
  rt.partial({ isDefault: rt.undefined, isStatic: rt.undefined }),
]);

export type CreateMetricsExplorerViewAttributesRequestPayload = rt.TypeOf<
  typeof createMetricsExplorerViewAttributesRequestPayloadRT
>;

export const createMetricsExplorerViewRequestPayloadRT = rt.type({
  attributes: createMetricsExplorerViewAttributesRequestPayloadRT,
});

export type CreateMetricsExplorerViewResponsePayload = rt.TypeOf<typeof metricsExplorerViewRT>;
