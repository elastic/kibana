/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexSettings } from '@kbn/index-management-plugin/common';

import { API_BASE_PATH } from '../constants';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export function settingsApi(getService: FtrProviderContext['getService']) {
  const supertest = getService('supertest');

  const getIndexSettings = (index: string) =>
    supertest
      .get(`${API_BASE_PATH}/settings/${index}`)
      .set('kbn-xsrf', 'xxx')
      .set('x-elastic-internal-origin', 'xxx');

  const updateIndexSettings = (index: string, settings: IndexSettings) =>
    supertest
      .put(`${API_BASE_PATH}/settings/${index}`)
      .set('kbn-xsrf', 'xxx')
      .set('x-elastic-internal-origin', 'xxx')
      .send(settings);

  return {
    getIndexSettings,
    updateIndexSettings,
  };
}
