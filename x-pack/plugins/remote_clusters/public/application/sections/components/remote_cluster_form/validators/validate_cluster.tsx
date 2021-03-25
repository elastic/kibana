/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateName } from './validate_name';
import { PROXY_MODE, SNIFF_MODE } from '../../../../../../common/constants';
import { validateSeeds } from './validate_seeds';
import { validateProxy } from './validate_proxy';
import { validateServerName } from './validate_server_name';
import { validateCloudUrl } from './validate_cloud_url';
import { FormFields } from '../remote_cluster_form';

type ClusterError = JSX.Element | null;

export interface ClusterErrors {
  name?: ClusterError;
  seeds?: ClusterError;
  proxyAddress?: ClusterError;
  serverName?: ClusterError;
  cloudUrl?: ClusterError;
}
export const validateCluster = (fields: FormFields, isCloudEnabled: boolean): ClusterErrors => {
  const { name, seeds = [], mode, proxyAddress, serverName, cloudUrlEnabled, cloudUrl } = fields;

  return {
    name: validateName(name),
    seeds: mode === SNIFF_MODE ? validateSeeds(seeds) : null,
    proxyAddress: !cloudUrlEnabled && mode === PROXY_MODE ? validateProxy(proxyAddress) : null,
    // server name is only required in cloud when proxy mode is enabled
    serverName:
      !cloudUrlEnabled && isCloudEnabled && mode === PROXY_MODE
        ? validateServerName(serverName)
        : null,
    cloudUrl: cloudUrlEnabled ? validateCloudUrl(cloudUrl) : null,
  };
};
