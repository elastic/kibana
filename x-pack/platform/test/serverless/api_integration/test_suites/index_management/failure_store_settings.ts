/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';
import type { InternalRequestHeader, RoleCredentials } from '../../../shared/services';

const API_BASE_PATH = '/api/index_management';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  const DEFAULT_RETENTION_SETTING = 'data_streams.lifecycle.retention.failures_default';

  const getFailureStoreSettings = () =>
    supertestWithoutAuth
      .get(`${API_BASE_PATH}/data_streams/failure_store_settings`)
      .set(internalReqHeader)
      .set(roleAuthc.apiKeyHeader);

  const clearSettings = () =>
    es.cluster.putSettings({
      persistent: { [DEFAULT_RETENTION_SETTING]: null },
    });

  describe('Failure store settings', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await clearSettings();
    });

    after(async () => {
      await clearSettings();
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('returns the cluster default failed data retention with the expected shape', async () => {
      const { defaults } = await es.cluster.getSettings({ include_defaults: true });
      const esDefaultRetention = defaults?.data_streams?.lifecycle?.retention?.failures_default;

      const { body } = await getFailureStoreSettings().expect(200);

      expect(
        Object.keys(body).every((key) => ['enabled', 'defaultRetentionPeriod'].includes(key))
      ).to.be(true);
      expect(body.defaultRetentionPeriod).to.eql(esDefaultRetention);
    });

    it('reflects the persistent cluster default failed data retention override', async () => {
      await es.cluster.putSettings({
        persistent: { [DEFAULT_RETENTION_SETTING]: '7d' },
      });

      const { body } = await getFailureStoreSettings().expect(200);

      expect(body.defaultRetentionPeriod).to.be('7d');
    });
  });
}
