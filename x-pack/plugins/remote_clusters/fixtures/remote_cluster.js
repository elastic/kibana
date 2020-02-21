/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getRandomString } from '../../../test_utils';

export const getRemoteClusterMock = ({
  name = getRandomString(),
  isConnected = true,
  connectedNodesCount = 1,
  seeds = ['localhost:9400'],
  isConfiguredByNode = false,
} = {}) => ({
  name,
  seeds,
  isConnected,
  connectedNodesCount,
  isConfiguredByNode,
  maxConnectionsPerCluster: 3,
  initialConnectTimeout: '30s',
  skipUnavailable: false,
});
