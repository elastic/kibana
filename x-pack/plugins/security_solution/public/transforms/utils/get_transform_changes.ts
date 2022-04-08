/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransformChangesForHosts } from './get_transform_changes_for_hosts';
import { getTransformChangesForKpi } from './get_transform_changes_for_kpi';
import { getTransformChangesForMatrixHistogram } from './get_transform_changes_for_matrix_histogram';
import { getTransformChangesForNetwork } from './get_transform_changes_for_network';
import { getTransformChangesForUsers } from './get_transform_changes_for_users';
import { GetTransformChanges } from './types';

export const getTransformChanges: GetTransformChanges = ({
  factoryQueryType,
  settings,
  histogramType,
}) => {
  const kpiTransform = getTransformChangesForKpi({ factoryQueryType, settings });
  if (kpiTransform != null) {
    return kpiTransform;
  }

  const hostTransform = getTransformChangesForHosts({ factoryQueryType, settings });
  if (hostTransform != null) {
    return hostTransform;
  }

  const userTransform = getTransformChangesForUsers({ factoryQueryType, settings });
  if (userTransform != null) {
    return userTransform;
  }

  const networkTransform = getTransformChangesForNetwork({
    factoryQueryType,
    settings,
  });
  if (networkTransform != null) {
    return networkTransform;
  }

  const matrixHistogram = getTransformChangesForMatrixHistogram({
    factoryQueryType,
    settings,
    histogramType,
  });
  if (matrixHistogram != null) {
    return matrixHistogram;
  }

  // nothing matches
  return undefined;
};
