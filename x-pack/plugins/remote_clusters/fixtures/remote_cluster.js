/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRandomString } from '@kbn/test-jest-helpers';

import { SNIFF_MODE } from '../common/constants';

export const getRemoteClusterMock = ({
  name = getRandomString(),
  isConnected = true,
  connectedNodesCount = 1,
  connectedSocketsCount,
  seeds = ['localhost:9400'],
  isConfiguredByNode = false,
  mode = SNIFF_MODE,
  proxyAddress,
  hasDeprecatedProxySetting = false,
} = {}) => ({
  name,
  seeds,
  isConnected,
  connectedNodesCount,
  isConfiguredByNode,
  maxConnectionsPerCluster: 3,
  initialConnectTimeout: '30s',
  skipUnavailable: false,
  mode,
  connectedSocketsCount,
  proxyAddress,
  hasDeprecatedProxySetting,
});
