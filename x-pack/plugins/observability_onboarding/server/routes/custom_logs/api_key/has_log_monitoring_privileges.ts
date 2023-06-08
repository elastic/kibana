/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { every } from 'lodash';
import { cluster, indices, privileges } from './monitoring_config';

export async function hasLogMonitoringPrivileges(
  esClient: ElasticsearchClient
) {
  const { index, cluster: clusterMonitor } =
    await esClient.security.hasPrivileges({
      body: {
        index: indices,
        cluster,
      },
    });

  const hasPrivileges =
    clusterMonitor.monitor &&
    every(
      index,
      privileges.reduce(
        (result, privilege) => ({
          ...result,
          [privilege]: true,
        }),
        {}
      )
    );

  return hasPrivileges;
}
