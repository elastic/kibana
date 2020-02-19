/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';

export interface RouteDependencies {
  router: IRouter;
  elasticsearch: ElasticsearchPlugin;
}

export interface RequestShim {
  headers: Record<string, string>;
  payload: any;
  params: any;
}
