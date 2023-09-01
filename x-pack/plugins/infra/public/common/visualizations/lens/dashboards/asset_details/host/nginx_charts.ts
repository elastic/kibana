/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  nginxActiveConnections,
  nginxRequestRate,
  nginxRequestsPerConnection,
  nginxResponseStatusCodes,
} from '../metric_charts/nginx';
import type { XYConfig } from '../metric_charts/types';

export const nginxStubstatusMetrics: XYConfig[] = [
  nginxActiveConnections,
  nginxRequestRate,
  nginxRequestsPerConnection,
];

export const nginxAccessMetrics: XYConfig[] = [nginxResponseStatusCodes];
