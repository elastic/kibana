/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { getApmIndexPatterns } from '../bundle/get_indices';

export async function getDiagnosticsPrivileges({
  esClient,
  apmIndices,
}: {
  esClient: ElasticsearchClient;
  apmIndices: APMIndices;
}) {
  const indexPatterns = getApmIndexPatterns([
    apmIndices.error,
    apmIndices.metric,
    apmIndices.span,
    apmIndices.transaction,
  ]);

  const clusterPrivileges = [
    'manage_index_templates',
    'monitor',
    'read_pipeline',
  ];
  const { index, cluster } = await esClient.security.hasPrivileges({
    body: {
      index: [
        {
          names: indexPatterns,
          privileges: ['read'],
        },
      ],
      cluster: clusterPrivileges,
    },
  });

  const hasAllIndexPrivileges = Object.values(index).every((indexPrivs) =>
    Object.values(indexPrivs).every((priv) => priv)
  );

  const hasAllClusterPrivileges = Object.values(cluster).every((priv) => priv);

  return {
    index,
    cluster,
    hasAllIndexPrivileges,
    hasAllClusterPrivileges,
    hasAllPrivileges: hasAllIndexPrivileges && hasAllClusterPrivileges,
  };
}
