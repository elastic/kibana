/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';

export const getStandaloneClusterDefinition = () => {
  return {
    cluster_uuid: STANDALONE_CLUSTER_CLUSTER_UUID,
    license: {},
    cluster_state: {},
    cluster_stats: {
      nodes: {
        jvm: {},
        count: {},
      },
    },
    elasticsearch: {
      cluster: {
        stats: {
          nodes: {
            jvm: {},
            count: {},
          },
        },
      },
    },
  };
};
