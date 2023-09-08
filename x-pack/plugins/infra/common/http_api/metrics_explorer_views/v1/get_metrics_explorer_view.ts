/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { metricsExplorerViewRT } from '../../../metrics_explorer_views';

export const getMetricsExplorerViewRequestParamsRT = rt.type({
  metricsExplorerViewId: rt.string,
});

export type GetMetricsExplorerViewResponsePayload = rt.TypeOf<typeof metricsExplorerViewRT>;
