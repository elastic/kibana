/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApmsForClusters } from '../../../../lib/apm/get_apms_for_clusters';
import { LegacyRequest } from '../../../../types';

export const getApmClusterStatus = (
  req: LegacyRequest,
  {
    clusterUuid,
  }: {
    clusterUuid: string;
  }
) => {
  const clusters = [{ cluster_uuid: clusterUuid }];
  return getApmsForClusters(req, clusters).then((apms) => {
    const [{ stats, config }] = apms;
    return {
      ...stats,
      config,
    };
  });
};
