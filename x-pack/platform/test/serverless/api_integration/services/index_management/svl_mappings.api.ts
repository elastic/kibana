/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from './constants';
import { FtrProviderContext } from '../../ftr_provider_context';
import { RoleCredentials } from '../../../shared/services';

export function SvlMappingsApi({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');

  const getMapping = async (index: string, roleAuthc: RoleCredentials) =>
    await supertestWithoutAuth
      .get(`${API_BASE_PATH}/mapping/${index}`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader);

  const updateMappings = async (index: string, roleAuthc: RoleCredentials) =>
    await supertestWithoutAuth
      .put(`${API_BASE_PATH}/mapping/${index}`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send({ name: { type: 'text' } });

  return {
    getMapping,
    updateMappings,
  };
}
