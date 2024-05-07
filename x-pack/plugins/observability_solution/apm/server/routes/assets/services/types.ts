/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SignalTypes {
  'asset.trace'?: boolean;
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

export interface AssetServicesResponse {
  services: Array<{ asset: AssetItem; service: ServiceItem }>;
}
