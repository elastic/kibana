/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { networkTrafficWithInterfaces } from '../../../shared/metrics/snapshot/network_traffic_with_interfaces';
export const rx = networkTrafficWithInterfaces(
  'rx',
  'docker.network.inbound.bytes',
  'docker.network.interface'
);
