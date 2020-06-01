/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ROUTES } from '../../../common/constants';
import { Cluster } from '../../models/cluster';

export class ClusterService {
  constructor(http) {
    this.http = http;
  }

  loadCluster() {
    return this.http.get(`${ROUTES.API_ROOT}/cluster`).then((response) => {
      if (!response) {
        return;
      }
      return Cluster.fromUpstreamJSON(response.cluster);
    });
  }

  isClusterInfoAvailable() {
    return this.loadCluster()
      .then((cluster) => Boolean(cluster))
      .catch(() => false);
  }
}
