/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getRandomString } from '../../../test_utils';

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
