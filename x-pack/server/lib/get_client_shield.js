/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';
import addShieldExtensions from './esjs_shield_plugin';

export const getClient = once((server) => {
  const config = {
    ...server.config().get('elasticsearch')
  };
  const cluster = server.plugins.elasticsearch.createCluster('security', config);

  addShieldExtensions(cluster._client);
  addShieldExtensions(cluster._noAuthClient);

  return cluster;
});
