/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This file should only export page-level components for view controllers to
 * mount React to the DOM
 */
export { NoData } from './no_data';
export { License } from './license';
export { PageLoading } from './page_loading';
export { ElasticsearchOverview, ElasticsearchNodes, ElasticsearchIndices } from './elasticsearch';
