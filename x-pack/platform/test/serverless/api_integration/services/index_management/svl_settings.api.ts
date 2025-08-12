/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexSettings } from '@kbn/index-management-plugin/common';
import { RoleCredentials } from '../../../shared/services';
import { API_BASE_PATH } from './constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export function SvlSettingsApi({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const getIndexSettings = async (index: string, roleAuthc: RoleCredentials) =>
    await supertestWithoutAuth
      .get(`${API_BASE_PATH}/settings/${index}`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader);

  const updateIndexSettings = async (
    index: string,
    settings: IndexSettings,
    roleAuthc: RoleCredentials
  ) =>
    await supertestWithoutAuth
      .put(`${API_BASE_PATH}/settings/${index}`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send(settings);

  return {
    getIndexSettings,
    updateIndexSettings,
  };
}
