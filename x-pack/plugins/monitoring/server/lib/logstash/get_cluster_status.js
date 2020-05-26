/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { getLogstashForClusters } from './get_logstash_for_clusters';

/**
 * Get the cluster status for Logstash instances.
 * The cluster status should only be displayed on cluster-wide pages. Individual Logstash nodes should show the node's status only.
 * Shared functionality between the different routes.
 *
 * @param {Object} req The incoming request.
 * @param {String} lsIndexPattern The Logstash pattern to query for the current time range.
 * @param {String} clusterUuid The cluster UUID for the associated Elasticsearch cluster.
 * @returns {Promise} The cluster status object.
 */
export function getClusterStatus(req, lsIndexPattern, { clusterUuid }) {
  checkParam(lsIndexPattern, 'lsIndexPattern in logstash/getClusterStatus');

  const clusters = [{ cluster_uuid: clusterUuid }];
  return getLogstashForClusters(req, lsIndexPattern, clusters).then((clusterStatus) =>
    get(clusterStatus, '[0].stats')
  );
}
