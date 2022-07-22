/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchIndexWithIngestion } from '../../../common/types/indices';

export interface Crawler {
  domains: [];
}

export const enum IngestionMethod {
  CONNECTOR,
  CRAWLER,
  API,
}

export const enum IngestionStatus {
  CONNECTED,
  ERROR,
  SYNC_ERROR,
  INCOMPLETE,
}

export interface ElasticsearchViewIndex extends ElasticsearchIndexWithIngestion {
  ingestionMethod: IngestionMethod;
  ingestionStatus: IngestionStatus;
  lastUpdated: string | 'never' | null; // date string
}
