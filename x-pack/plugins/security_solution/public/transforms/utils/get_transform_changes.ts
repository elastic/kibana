/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransformChangesForHosts } from './get_transform_changes_for_hosts';
import { getTransformChangesForKpi } from './get_transform_changes_for_kpi';
import { getTransformChangesForNetwork } from './get_transform_changes_for_network';
import { GetTransformChanges } from './types';

export const getTransformChanges: GetTransformChanges = ({
  factoryQueryType,
  settings,
  histogramType,
}) => {
  const kpiTransform = getTransformChangesForKpi({ factoryQueryType, settings });
  if (kpiTransform) {
    return kpiTransform;
  }
  const hostTransform = getTransformChangesForHosts({ factoryQueryType, settings });
  if (hostTransform) {
    return hostTransform;
  }
  const networkTransform = getTransformChangesForNetwork({
    factoryQueryType,
    histogramType,
    settings,
  });
  if (networkTransform) {
    return networkTransform;
  }

  // nothing matches
  return undefined;
};
