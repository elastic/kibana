/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { BucketRT } from '../../lib/metrics/types';

export const HostsSearchResponseRT = rt.type({
  groupings: rt.type({
    buckets: BucketRT,
  }),
});

export type HostsSearchResponse = rt.TypeOf<typeof HostsSearchResponseRT>;
