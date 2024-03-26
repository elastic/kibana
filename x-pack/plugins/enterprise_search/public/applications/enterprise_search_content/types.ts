/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchIndex, ElasticsearchViewIndexExtension } from '@kbn/search-connectors';

import { ConnectorIndex } from '@kbn/search-connectors/types/indices';

import { CrawlerIndex } from '../../../common/types/indices';

export type ConnectorViewIndex = ConnectorIndex & ElasticsearchViewIndexExtension;

export type CrawlerViewIndex = CrawlerIndex & ElasticsearchViewIndexExtension;

export type ApiViewIndex = ElasticsearchIndex & ElasticsearchViewIndexExtension;

export type ElasticsearchViewIndex = CrawlerViewIndex | ConnectorViewIndex | ApiViewIndex;
