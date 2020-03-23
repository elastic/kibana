/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InventoryMetric } from '../../types';

export const nginx: InventoryMetric[] = [
  'nginxHits',
  'nginxRequestRate',
  'nginxActiveConnections',
  'nginxRequestsPerConnection',
];

export const aws: InventoryMetric[] = [
  'awsOverview',
  'awsCpuUtilization',
  'awsNetworkBytes',
  'awsNetworkPackets',
  'awsDiskioOps',
  'awsDiskioBytes',
];
