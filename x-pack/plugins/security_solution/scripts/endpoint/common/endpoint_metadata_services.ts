/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { KbnClient } from '@kbn/test';
import { resolvePathVariables } from '../../../public/common/utils/resolve_path_variables';
import { HOST_METADATA_GET_ROUTE } from '../../../common/endpoint/constants';
import { HostInfo } from '../../../common/endpoint/types';

export const fetchEndpointMetadata = async (
  kbnClient: KbnClient,
  agentId: string
): Promise<HostInfo> => {
  return (
    await kbnClient.request<HostInfo>({
      method: 'GET',
      path: resolvePathVariables(HOST_METADATA_GET_ROUTE, { id: agentId }),
    })
  ).data;
};

export const sendEndpointMetadataUpdate = async (esClient: Client, agentId: string) => {
  //
};
