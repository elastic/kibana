/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { OverviewTestBed } from './overview.helpers';
export { setup as setupOverviewPage } from './overview.helpers';
export type { ElasticsearchTestBed } from './elasticsearch.helpers';
export { setup as setupElasticsearchPage } from './elasticsearch.helpers';
export type { KibanaTestBed } from './kibana.helpers';
export { setup as setupKibanaPage } from './kibana.helpers';

export { setupEnvironment, kibanaVersion } from './setup_environment';
