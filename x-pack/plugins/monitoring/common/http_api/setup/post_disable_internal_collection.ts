/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { clusterUuidRT } from '../shared';

export const postDisableInternalCollectionRequestParamsRT = rt.partial({
  // the cluster uuid seems to be required but never used
  clusterUuid: clusterUuidRT,
});
