/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { loginAsReadOnlyUser } from '../helpers/login';
import url from 'url';
import { journey, step, before, Page } from '@elastic/synthetics';
import { synthtraceIndex } from '../../helpers/synthtrace';
import { assertText } from '../../helpers/utils';
import { opbeans } from '../../playwright/fixtures/synthtrace/opbeans';

journey(
  'Service inventory',
  ({ page, params }: { page: Page; params: any }) => {
    const start = '2021-10-10T00:00:00.000Z';
    const end = '2021-10-10T00:15:00.000Z';

    before(async () => {
      await synthtraceIndex(
        opbeans({
          from: new Date(start).getTime(),
          to: new Date(end).getTime(),
        })
      );
    });

    step('Visit service inventory page', async () => {
      const serviceInventoryHref = url.format({
        host: params.kibanaUrl,
        pathname: '/app/apm/services',
        query: { rangeFrom: start, rangeTo: end },
      });

      await page.goto(serviceInventoryHref, {
        waitUntil: 'networkidle',
      });
    });

    step('Login into kibana', async () => {
      await page.fill('[data-test-subj=loginUsername]', 'elastic', {
        timeout: 60 * 1000,
      });
      await page.fill('[data-test-subj=loginPassword]', 'changeme');
      await page.click('[data-test-subj=loginSubmit]');
    });

    step('has a list of services', async () => {
      await assertText({ page, text: 'opbeans-java' });
      await assertText({ page, text: 'opbeans-node' });
      await assertText({ page, text: 'opbeans-rum' });
    });
  }
);
