/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorViewIndex, CrawlerViewIndex } from '@kbn/search-connectors';
import {
  ElasticsearchIndex,
  ElasticsearchViewIndexExtension,
} from '@kbn/search-connectors/types/indices';

export type ApiViewIndex = ElasticsearchIndex & ElasticsearchViewIndexExtension;
export type ElasticsearchViewIndex = CrawlerViewIndex | ConnectorViewIndex | ApiViewIndex;
