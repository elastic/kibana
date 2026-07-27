/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../ftr_provider_context';
import { API_BASE_PATH } from './constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  const getFailureStoreSettings = () =>
    supertest.get(`${API_BASE_PATH}/data_streams/failure_store_settings`).set('kbn-xsrf', 'xxx');

  const DEFAULT_RETENTION_SETTING = 'data_streams.lifecycle.retention.failures_default';

  const clearSettings = () =>
    es.cluster.putSettings({
      persistent: { [DEFAULT_RETENTION_SETTING]: null },
    });

  describe('Failure store settings', () => {
    before(async () => await clearSettings());
    after(async () => await clearSettings());

    it('falls back to the cluster default failed data retention when no override is set', async () => {
      await clearSettings();
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
