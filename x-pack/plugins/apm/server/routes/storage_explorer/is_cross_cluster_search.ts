/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../lib/helpers/setup_request';

export function isCrossClusterSearch(setup: Setup) {
  const {
    indices: { transaction, span, metric, error },
  } = setup;

  const indicesIncludeRemoteCluster = [transaction, span, metric, error].some(
    (indices) => indices.includes(':')
  );

  return indicesIncludeRemoteCluster;
}
