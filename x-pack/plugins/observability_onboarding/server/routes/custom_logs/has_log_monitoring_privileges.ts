/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { every } from 'lodash';

export async function hasLogMonitoringPrivileges(
  esClient: ElasticsearchClient
) {
  const { index, cluster } = await esClient.security.hasPrivileges({
    body: {
      index: [
        {
          names: ['logs-*-*', 'metrics-*-*'],
          privileges: ['auto_configure', 'create_doc'],
        },
      ],
      cluster: ['monitor'],
    },
  });

  const hasPrivileges =
    cluster.monitor && every(index, { auto_configure: true, create_doc: true });

  return hasPrivileges;
}
