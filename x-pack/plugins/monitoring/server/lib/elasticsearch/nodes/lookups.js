/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Note: currently only `node` and `master` are supported due to
 * https://github.com/elastic/x-pack-kibana/issues/608
 */
export const nodeTypeClass = {
  invalid: 'fa-exclamation-triangle',
  node: 'fa-server',
  master: 'fa-star',
  master_only: 'fa-star-o',
  data: 'fa-database',
  client: 'fa-binoculars'
};

export const nodeTypeLabel = {
  invalid: 'Invalid Node',
  node: 'Node',
  master: 'Master Node',
  master_only: 'Master Only Node',
  data: 'Data Only Node',
  client: 'Client Node'
};
