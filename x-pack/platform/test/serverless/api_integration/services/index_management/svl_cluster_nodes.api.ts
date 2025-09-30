/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from './constants';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials } from '../../../shared/services';

export function SvlClusterNodesApi({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');

  const getNodesPlugins = (roleAuthc: RoleCredentials) =>
    supertestWithoutAuth
      .get(`${API_BASE_PATH}/nodes/plugins`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader);

  return {
    getNodesPlugins,
  };
}
