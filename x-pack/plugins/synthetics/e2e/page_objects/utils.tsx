/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect, Page } from '@elastic/synthetics';

export function utilsPageProvider({ page }: { page: Page }) {
  return {
    byTestId(testId: string) {
      return `[data-test-subj=${testId}]`;
    },

    async waitForLoadingToFinish() {
      while (true) {
        if ((await page.$(this.byTestId('kbnLoadingMessage'))) === null) break;
        await page.waitForTimeout(5 * 1000);
      }
    },

    async dismissSyntheticsCallout() {
      await page.click('[data-test-subj=uptimeDismissSyntheticsCallout]', {
        timeout: 60 * 1000,
      });
    },

    async assertText({ text }: { text: string }) {
      await page.waitForSelector(`text=${text}`);
      expect(await page.$(`text=${text}`)).toBeTruthy();
    },

    async fillByTestSubj(dataTestSubj: string, value: string) {
      await page.fill(`[data-test-subj=${dataTestSubj}]`, value);
    },

    async selectByTestSubj(dataTestSubj: string, value: string) {
      await page.selectOption(`[data-test-subj=${dataTestSubj}]`, value);
    },

    async checkByTestSubj(dataTestSubj: string, value: string) {
      await page.check(`[data-test-subj=${dataTestSubj}]`);
    },

    async clickByTestSubj(dataTestSubj: string) {
      await page.click(`[data-test-subj=${dataTestSubj}]`);
    },

    async findByTestSubj(dataTestSubj: string) {
      return await page.waitForSelector(`[data-test-subj=${dataTestSubj}]`);
    },

    async findByText(text: string) {
      return await page.waitForSelector(`text=${text}`);
    },
  };
}
