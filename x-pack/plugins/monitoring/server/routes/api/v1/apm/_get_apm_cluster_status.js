/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getApmsForClusters } from '../../../../lib/apm/get_apms_for_clusters';

export const getApmClusterStatus = (req, apmIndexPattern, { clusterUuid }) => {
  const clusters = [{ cluster_uuid: clusterUuid }];
  return getApmsForClusters(req, apmIndexPattern, clusters).then((apms) => get(apms, '[0].stats'));
};
