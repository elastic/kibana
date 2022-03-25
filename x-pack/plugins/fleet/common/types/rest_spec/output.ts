/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Output } from '../models';

import type { ListResult } from './common';

export interface GetOneOutputResponse {
  item: Output;
}

export interface DeleteOutputResponse {
  id: string;
}

export interface GetOneOutputRequest {
  params: {
    outputId: string;
  };
}

export interface PutOutputRequest {
  params: {
    outputId: string;
  };
  body: {
    type?: 'elasticsearch' | 'logstash';
    name?: string;
    hosts?: string[];
    ca_sha256?: string;
    ca_trusted_fingerprint?: string;
    config_yaml?: string;
    is_default?: boolean;
    is_default_monitoring?: boolean;
    ssl?: {
      certificate_authorities?: string[];
      certificate?: string;
      key?: string;
    };
  };
}

export interface PostOutputRequest {
  body: {
    id?: string;
    type: 'elasticsearch' | 'logstash';
    name: string;
    hosts?: string[];
    ca_sha256?: string;
    ca_trusted_fingerprint?: string;
    is_default?: boolean;
    is_default_monitoring?: boolean;
    config_yaml?: string;
    ssl?: {
      certificate_authorities?: string[];
      certificate?: string;
      key?: string;
    };
  };
}

export interface PutOutputResponse {
  item: Output;
}

export type GetOutputsResponse = ListResult<Output>;

export interface PostLogstashApiKeyResponse {
  api_key: string;
}
