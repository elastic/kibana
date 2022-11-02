/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: Replace all of this with Kibana ES client and/or data plugin

import { Client } from '@elastic/elasticsearch';
const {
  ELASTICSEARCH_HOSTS = 'https://localhost:9200',
  ELASTICSEARCH_USERNAME = 'elastic',
  ELASTICSEARCH_PASSWORD = 'changeme',
} = process.env;

export const esClient = new Client({
  node: ELASTICSEARCH_HOSTS,
  auth: {
    username: ELASTICSEARCH_USERNAME,
    password: ELASTICSEARCH_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});
