/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsRatesMetrics } from '@kbn/logs-data-access-plugin/server';
import { TraceMetrics } from './get_services_transaction_stats';

export interface SignalTypes {
  'asset.traces'?: boolean;
  'asset.logs'?: boolean;
}

interface ServiceItem {
  environment?: string;
  name: string;
}

interface AssetItem {
  signalTypes: SignalTypes;
  identifyingMetadata: string[];
}

export interface ServiceAssetDocument {
  asset: {
    signalTypes: SignalTypes;
    identifying_metadata: string[];
  };
  service: ServiceItem;
}

export interface AssetService {
  asset: AssetItem;
  service: ServiceItem;
}

export interface AssetServicesResponse {
  services: Array<AssetService & { metrics: TraceMetrics & LogsRatesMetrics }>;
}
