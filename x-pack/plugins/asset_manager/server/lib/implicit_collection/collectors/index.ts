/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core/server';
import { Asset } from '../../../../common/types_api';

export interface CollectorOptions {
  client: ElasticsearchClient;
  from: number;
}

export type Collector = (opts: CollectorOptions) => Promise<Asset[]>;

export { collectContainers } from './containers';
export { collectHosts } from './hosts';
export { collectPods } from './pods';
export { collectServices } from './services';
