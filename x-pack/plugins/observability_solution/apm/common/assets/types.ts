/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsRatesMetrics } from '@kbn/logs-data-access-plugin/server';
import { TraceMetrics } from './get_services_transaction_stats';

export enum SignalType {
  APM = 'metrics',
  LOGS = 'logs',
}

interface ServiceItem {
  environment?: string;
  name: string;
}

type SignalTypes = Record<SignalType, boolean | undefined>;

interface EntityItem {
  signalTypes: SignalTypes;
  identifyingMetadata: string[];
}

export interface ServiceEntityDocument {
  asset: {
    signalTypes: SignalTypes;
    identifying_metadata: string[];
  };
  service: ServiceItem;
}

export interface EntityServiceListItem {
  asset: EntityItem;
  service: ServiceItem;
  metrics: TraceMetrics & LogsRatesMetrics;
}

export interface EntityServicesResponse {
  services: Array<EntityServiceListItem>;
}
