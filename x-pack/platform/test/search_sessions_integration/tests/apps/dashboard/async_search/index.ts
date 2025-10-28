/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile, getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const searchSessions = getService('searchSessions');
  const { common } = getPageObjects(['common']);

  describe.skip('Dashboard', function () {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/logstash_functional'
      );
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/dashboard_async/async_search'
      );
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await kibanaServer.uiSettings.replace({ 'search:timeout': 10000 });
      await common.navigateToApp('dashboard');
    });

    beforeEach(async () => {
      await searchSessions.markTourDone();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await searchSessions.deleteAllSearchSessions();
    });

    loadTestFile(require.resolve('./async_search'));
    loadTestFile(require.resolve('./session_searches_integration'));
    loadTestFile(require.resolve('./save_search_session'));
    loadTestFile(require.resolve('./save_search_session_relative_time'));
    loadTestFile(require.resolve('./search_sessions_tour'));
    loadTestFile(require.resolve('./sessions_in_space'));
  });
}
