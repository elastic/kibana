/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BaseStreamName {
  name: string;
}

export interface DSNSStreamName extends BaseStreamName {
  type: 'dsns';
  datastreamType: string;
  datastreamDataset: string;
  datastreamNamespace: string;
  datasetSegments: string[];
}

export interface WiredStreamName extends BaseStreamName {
  type: 'wired';
  segments: string[];
}

export interface UnknownStreamName extends BaseStreamName {
  type: 'unknown';
}

export type StreamName = DSNSStreamName | WiredStreamName | UnknownStreamName;
