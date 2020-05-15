/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Output } from '../models';

export interface GetOneOutputResponse {
  item: Output;
  success: boolean;
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
    hosts?: string[];
    ca_sha256?: string;
  };
}

export interface PutOutputResponse {
  item: Output;
  success: boolean;
}

export interface GetOutputsResponse {
  items: Output[];
  total: number;
  page: number;
  perPage: number;
  success: boolean;
}
