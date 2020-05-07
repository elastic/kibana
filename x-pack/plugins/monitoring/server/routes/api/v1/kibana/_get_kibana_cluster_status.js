/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getKibanasForClusters } from '../../../../lib/kibana/get_kibanas_for_clusters';

export const getKibanaClusterStatus = (req, kbnIndexPattern, { clusterUuid }) => {
  const clusters = [{ cluster_uuid: clusterUuid }];
  return getKibanasForClusters(req, kbnIndexPattern, clusters).then(kibanas =>
    get(kibanas, '[0].stats')
  );
};
