/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterUuid } from '../../../../../common/http_api/shared';
import { getKibanasForClusters } from '../../../../lib/kibana/get_kibanas_for_clusters';
import { LegacyRequest } from '../../../../types';

export const getKibanaClusterStatus = (
  req: LegacyRequest,
  {
    clusterUuid,
  }: {
    clusterUuid: ClusterUuid;
  }
) => {
  const clusters = [{ cluster_uuid: clusterUuid }];
  return getKibanasForClusters(req, clusters).then((kibanas) => kibanas?.[0]?.stats);
};
