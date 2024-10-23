/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Page } from '@elastic/synthetics';
import { loginPageProvider } from '@kbn/synthetics-e2e/page_objects/login';
import { utilsPageProvider } from '@kbn/synthetics-e2e/page_objects/utils';
import { recordVideo } from '@kbn/synthetics-e2e/helpers/record_video';

export function sloAppPageProvider({ page, kibanaUrl }: { page: Page; kibanaUrl: string }) {
  page.setDefaultTimeout(60 * 1000);
  recordVideo(page);

  return {
    ...loginPageProvider({
      page,
      username: 'elastic',
      password: 'changeme',
    }),
    ...utilsPageProvider({ page }),

    async navigateToOverview(doLogin = false) {
      await page.goto(`${kibanaUrl}/app/slo`, {
        waitUntil: 'networkidle',
      });
      if (doLogin) {
        await this.loginToKibana();
      }
    },
  };
}
