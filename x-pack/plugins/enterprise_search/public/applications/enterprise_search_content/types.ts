/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorIndex, CrawlerIndex, ElasticsearchIndex } from '../../../common/types/indices';

export interface Crawler {
  domains: [];
}

export enum IngestionMethod {
  CONNECTOR = 'connector',
  CRAWLER = 'crawler',
  API = 'api',
}

export enum IngestionStatus {
  CONFIGURED,
  CONNECTED,
  ERROR,
  SYNC_ERROR,
  INCOMPLETE,
}

interface ElasticsearchViewIndexExtension {
  ingestionMethod: IngestionMethod;
  ingestionStatus: IngestionStatus;
  lastUpdated: string | 'never' | null; // date string
}

export type ConnectorViewIndex = ConnectorIndex & ElasticsearchViewIndexExtension;

export type CrawlerViewIndex = CrawlerIndex & ElasticsearchViewIndexExtension;

export type ApiViewIndex = ElasticsearchIndex & ElasticsearchViewIndexExtension;

export type ElasticsearchViewIndex = CrawlerViewIndex | ConnectorViewIndex | ApiViewIndex;
