/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

test.describe(
  'Infrastructure page',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsEditor();
    });

    test('when container ids, pod names and host names are returned shows all tabs', async ({
      page,
      kbnUrl,
    }) => {
      const goServiceInfraPageHref = `${kbnUrl.app('apm')}/services/synth-go/infrastructure?rangeFrom=${testData.START_DATE}&rangeTo=${testData.END_DATE}`;
      await page.goto(goServiceInfraPageHref);
      await expect(page.getByText('Infrastructure')).toBeVisible();
      await expect(page.getByText('Containers')).toBeVisible();
      await expect(page.getByText('Pods')).toBeVisible();
      await expect(page.getByText('Hosts')).toBeVisible();
    });

    test('when only host names are returned shows only Hosts tab', async ({
      page,
      kbnUrl,
    }) => {
      const javaServiceInfraPageHref = `${kbnUrl.app('apm')}/services/synth-java/infrastructure?rangeFrom=${testData.START_DATE}&rangeTo=${testData.END_DATE}`;
      await page.goto(javaServiceInfraPageHref);
      await expect(page.getByText('Infrastructure')).toBeVisible();
      await expect(page.getByText('Hosts')).toBeVisible();
    });

    test('when none infrastructure attributes are returned shows no data message', async ({
      page,
      kbnUrl,
    }) => {
      const nodeServiceInfraPageHref = `${kbnUrl.app('apm')}/services/synth-node/infrastructure?rangeFrom=${testData.START_DATE}&rangeTo=${testData.END_DATE}`;
      await page.goto(nodeServiceInfraPageHref);
      await expect(page.getByText('Infrastructure')).toBeVisible();
      await expect(page.getByText('No results match your search criteria.')).toBeVisible();
    });
  }
);
