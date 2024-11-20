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
import { validateCloudRemoteAddress } from './validate_cloud_url';
import { FormFields } from '../remote_cluster_form';
import { validateNodeConnections } from './validate_node_connections';

type ClusterError = JSX.Element | null;

export interface ClusterErrors {
  name?: ClusterError;
  seeds?: ClusterError;
  proxyAddress?: ClusterError;
  cloudRemoteAddress?: ClusterError;
  nodeConnections?: ClusterError;
}
export const validateCluster = (fields: FormFields, isCloudEnabled: boolean): ClusterErrors => {
  const { name, seeds = [], mode, proxyAddress, cloudRemoteAddress, nodeConnections } = fields;

  return {
    name: validateName(name),
    seeds: mode === SNIFF_MODE ? validateSeeds(seeds) : null,
    proxyAddress: mode === PROXY_MODE ? validateProxy(proxyAddress) : null,
    cloudRemoteAddress: isCloudEnabled ? validateCloudRemoteAddress(cloudRemoteAddress) : null,
    nodeConnections: mode === SNIFF_MODE ? validateNodeConnections(nodeConnections) : null,
  };
};
