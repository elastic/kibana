/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const monacoEditor = getService('monacoEditor');
  const searchSessions = getService('searchSessions');
  const toasts = getService('toasts');
  const esArchiver = getService('esArchiver');

  const { common, timePicker, discover } = getPageObjects(['common', 'discover', 'timePicker']);

  describe('Discover background search notifications', function () {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await common.navigateToApp('discover');
      await discover.selectTextBaseLang();
    });

    it('shows a completion toast for background search', async () => {
      // Set the time range so there are results for the query
      await timePicker.setDefaultAbsoluteRange();
      await monacoEditor.setCodeEditorValue('FROM logstash-* | LIMIT 1 | EVAL DELAY(5000ms)');

      // Run the query and send the search session to background
      await searchSessions.save({ withRefresh: true });

      // Verify the completion toast is shown
      await retry.waitFor('completion toast is shown', async () => {
        const toastContent = await toasts.getContentByIndex(1); // 0 is the sent to background toast, 1 is the completion toast
        return toastContent.includes('Background search completed');
      });
    });
  });
}
