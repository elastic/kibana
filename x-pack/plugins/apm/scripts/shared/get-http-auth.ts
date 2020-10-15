/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaConfig } from './read-kibana-config';

export const getHttpAuth = (config: KibanaConfig) => {
  const httpAuth =
    config['elasticsearch.username'] && config['elasticsearch.password']
      ? {
          username: config['elasticsearch.username'],
          password: config['elasticsearch.password'],
        }
      : null;

  return httpAuth;
};
