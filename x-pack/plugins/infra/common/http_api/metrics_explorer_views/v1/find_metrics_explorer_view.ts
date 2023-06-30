/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  metricsExplorerViewBasicAttributesRT,
  singleMetricsExplorerViewRT,
} from '../../../metrics_explorer_views';

export const findMetricsExplorerViewAttributesResponseRT = rt.exact(
  rt.intersection([
    metricsExplorerViewBasicAttributesRT,
    rt.partial({
      isDefault: rt.boolean,
      isStatic: rt.boolean,
    }),
  ])
);

export const findMetricsExplorerViewResponsePayloadRT = rt.type({
  data: rt.array(singleMetricsExplorerViewRT),
});

export type FindMetricsExplorerViewResponsePayload = rt.TypeOf<
  typeof findMetricsExplorerViewResponsePayloadRT
>;
