/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function GrokDebuggerProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const monacoEditor = getService('monacoEditor');

  // test subject selectors
  const SUBJ_CONTAINER = 'grokDebuggerContainer';

  const SUBJ_BTN_TOGGLE_CUSTOM_PATTERNS_INPUT = `${SUBJ_CONTAINER} > btnToggleCustomPatternsInput`;
  const SUBJ_BTN_SIMULATE = `${SUBJ_CONTAINER} > btnSimulate`;

  return new (class GrokDebugger {
    async clickSimulate() {
      await testSubjects.click(SUBJ_BTN_SIMULATE);
    }

    async setEventInput(value: string) {
      await monacoEditor.setCodeEditorValue(value, 0);
    }

    async setPatternInput(value: string) {
      await monacoEditor.setCodeEditorValue(value, 1);
    }

    async toggleCustomPatternsInput() {
      await testSubjects.click(SUBJ_BTN_TOGGLE_CUSTOM_PATTERNS_INPUT);
    }

    async setCustomPatternsInput(value: string) {
      await monacoEditor.setCodeEditorValue(value, 2);
    }

    async getEventOutput() {
      return await testSubjects.getVisibleText('eventOutputCodeBlock');
    }

    async assertExists() {
      await retry.waitFor('Grok Debugger to exist', async () => {
        return await testSubjects.exists(SUBJ_CONTAINER);
      });
    }

    async assertEventOutput(expectedValue: string) {
      await retry.try(async () => {
        const value = JSON.parse(await this.getEventOutput());
        expect(value).to.eql(expectedValue);
      });
    }
  })();
}
