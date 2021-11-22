/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { getKibanasForClusters } from '../../../../lib/kibana/get_kibanas_for_clusters';

export const getKibanaClusterStatus = (req, { clusterUuid }) => {
  const clusters = [{ cluster_uuid: clusterUuid }];
  return getKibanasForClusters(req, clusters).then((kibanas) => get(kibanas, '[0].stats'));
};
