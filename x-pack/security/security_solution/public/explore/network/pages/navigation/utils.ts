/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NETWORK_PATH_WITH_ANOMALIES, NETWORK_PATH_WITHOUT_ANOMALIES } from '../constants';
import type { GetNetworkRoutePath } from './types';

export const getNetworkRoutePath: GetNetworkRoutePath = (
  capabilitiesFetched,
  hasMlUserPermission
) =>
  capabilitiesFetched && !hasMlUserPermission
    ? NETWORK_PATH_WITHOUT_ANOMALIES
    : NETWORK_PATH_WITH_ANOMALIES;
