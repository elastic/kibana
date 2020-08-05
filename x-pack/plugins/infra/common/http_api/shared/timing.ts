/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { tracingSpanRT } from '../../performance_tracing';

export const routeTimingMetadataRT = rt.type({
  spans: rt.array(tracingSpanRT),
});
