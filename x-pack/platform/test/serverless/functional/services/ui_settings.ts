/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { RoleCredentials } from '../../shared/services';

export function UISettingsServiceProvider({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  return {
    async setUiSetting(role: RoleCredentials, settingId: string, value: unknown) {
      await supertestWithoutAuth
        .post(`/internal/kibana/settings/${settingId}`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(role.apiKeyHeader)
        .send({ value })
        .expect(200);
    },
    async deleteUISetting(role: RoleCredentials, settingId: string) {
      await supertestWithoutAuth
        .delete(`/internal/kibana/settings/${settingId}`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(role.apiKeyHeader)
        .expect(200);
    },
  };
}
