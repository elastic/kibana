/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DEFAULT_INPUT_VALUE } from '@kbn/console-plugin/common/constants';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['svlCommonPage', 'common', 'console', 'header']);
  const browser = getService('browser');

  describe('console app', function describeIndexTests() {
    before(async () => {
      // TODO: https://github.com/elastic/kibana/issues/176582
      // this test scenario requires roles definition check:
      // Search & Oblt projects 'viewer' role has access to Console, but for
      // Security project only 'admin' role has access
      await PageObjects.svlCommonPage.loginAsAdmin();
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('dev_tools', { hash: '/console' });
    });

    it('should show the default request', async () => {
      await retry.try(async () => {
        const actualRequest = await PageObjects.console.getEditorText();
        log.debug(actualRequest);
        expect(DEFAULT_INPUT_VALUE.replace(/\s/g, '')).to.contain(actualRequest.replace(/\s/g, ''));
      });
    });

    it('default request response should include `"timed_out" : false`', async () => {
      const expectedResponseContains = `"timed_out": false`;
      await PageObjects.console.selectAllRequests();
      await PageObjects.console.clickPlay();
      await retry.try(async () => {
        const actualResponse = await PageObjects.console.getOutputText();
        log.debug(actualResponse);
        expect(actualResponse).to.contain(expectedResponseContains);
      });
    });

    it('should open API Reference documentation page when open documentation button is clicked', async () => {
      await PageObjects.console.clearEditorText();
      await PageObjects.console.enterText('GET _search');
      await PageObjects.console.clickContextMenu();
      await PageObjects.console.clickOpenDocumentationButton();

      await retry.tryForTime(10000, async () => {
        await browser.switchTab(1);
      });

      // Retry until the documentation is loaded
      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/docs/api');
      });

      // Close the documentation tab
      await browser.closeCurrentWindow();
      await browser.switchTab(0);
    });

    describe('clickable links', () => {
      it('should have links enabled in the input editor but not the output editor', async () => {
        // Verify that only the input editor has links enabled
        const editorsConfig = await browser.execute(() => {
          const monaco = (window as any).MonacoEnvironment?.monaco;
          if (!monaco) return { input: false, output: false };

          const editors = monaco.editor.getEditors();

          // Find editors by their DOM containers using test subjects
          const inputEditor = editors.find((e: any) => {
            const container = e.getContainerDomNode();
            return container?.closest('[data-test-subj="consoleMonacoEditor"]');
          });

          const outputEditor = editors.find((e: any) => {
            const container = e.getContainerDomNode();
            return container?.closest('[data-test-subj="consoleMonacoOutput"]');
          });

          return {
            input: inputEditor?.getOptions().get(monaco.editor.EditorOption.links) || false,
            output: outputEditor?.getOptions().get(monaco.editor.EditorOption.links) || false,
          };
        });

        expect(editorsConfig.input).to.be(true);
        expect(editorsConfig.output).to.be(false);
      });
    });
  });
}
