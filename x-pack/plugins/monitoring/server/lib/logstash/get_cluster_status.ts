/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { getLogstashForClusters } from './get_logstash_for_clusters';
import { LegacyRequest } from '../../types';

/**
 * Get the cluster status for Logstash instances.
 * The cluster status should only be displayed on cluster-wide pages. Individual Logstash nodes should show the node's status only.
 * Shared functionality between the different routes.
 *
 * @param {Object} req The incoming request.
 * @param {String} clusterUuid The cluster UUID for the associated Elasticsearch cluster.
 * @returns {Promise} The cluster status object.
 */
export function getClusterStatus(req: LegacyRequest, { clusterUuid }: { clusterUuid: string }) {
  const clusters = [{ cluster_uuid: clusterUuid }];
  return getLogstashForClusters(req, clusters).then((clusterStatus) =>
    get(clusterStatus, '[0].stats')
  );
}
