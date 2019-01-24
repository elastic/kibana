/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UNLINKED_DEPLOYMENT_CLUSTER_UUID } from '../../../common/constants';

export const unlinkedDeploymentClusterDefinition = {
  cluster_uuid: UNLINKED_DEPLOYMENT_CLUSTER_UUID,
  isSupported: true,
  license: {},
  cluster_state: {},
  cluster_stats: {
    nodes: {
      jvm: {},
      count: {}
    }
  }
};
