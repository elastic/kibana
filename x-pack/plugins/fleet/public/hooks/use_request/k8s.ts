/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentPolicyRouteService } from '../../services';

import type { GetFullAgentManifestResponse } from '../../../common';

import { sendRequest } from './use_request';

export const sendGetK8sManifest = (query: { fleetServer?: string; enrolToken?: string } = {}) => {
  return sendRequest<GetFullAgentManifestResponse>({
    path: agentPolicyRouteService.getK8sInfoPath(),
    method: 'get',
    query,
  });
};
