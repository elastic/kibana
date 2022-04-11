/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ElasticsearchClient } from 'kibana/server';

/**
  Function for collecting information about canvas usage
 */
export type TelemetryCollector = (
  /** The server instance */
  kibanaIndex: string,
  /** Function for calling elasticsearch */
  esClient: ElasticsearchClient
) => Record<string, any>;

export interface TelemetryCustomElementDocument {
  content: string;
}

export interface TelemetryCustomElement {
  selectedNodes: Array<{
    expression: string;
  }>;
}
