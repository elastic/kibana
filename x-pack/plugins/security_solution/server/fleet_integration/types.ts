/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PolicyCreateEndpointConfig {
  type: 'endpoint';
  endpointConfig: {
    preset: 'NGAV' | 'EDREssential' | 'EDRComplete';
  };
}

export interface PolicyCreateEventFilters {
  nonInteractiveSession?: boolean;
}

export interface PolicyCreateCloudConfig {
  type: 'cloud';
  eventFilters?: PolicyCreateEventFilters;
}

export type AnyPolicyCreateConfig = PolicyCreateEndpointConfig | PolicyCreateCloudConfig;
