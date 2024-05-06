/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type SignalTypes = {
  'asset.trace'?: boolean;
  'asset.logs'?: boolean;
};

type ServiceItem = {
  environment?: string;
  name: string;
};

type AssetItem = {
  signalTypes: SignalTypes;
  identifyingMetadata: string[];
};

export type ServiceAssetDocument = {
  asset: {
    signalTypes: SignalTypes;
    identifying_metadata: string[];
  };
  service: ServiceItem;
};

export type AssetServicesResponse = {
  services: Array<{ asset: AssetItem; service: ServiceItem }>;
};
