/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 *
 * Failing: See https://github.com/elastic/kibana/issues/253586
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

test.describe(
  'Service overview - aws lambda',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.skip('displays a cold start rate chart and not a transaction breakdown chart', async ({
      page,
      kbnUrl,
    }) => {
      await page.goto(
        `${kbnUrl.app('apm')}/services/synth-python/overview?rangeFrom=2021-10-10T00:00:00.000Z&rangeTo=2021-10-10T00:15:00.000Z`
      );
      await expect(page.getByText('Cold start rate')).toBeVisible();
      await expect(page.getByText('Time spent by span type')).not.toBeVisible();
    });
  }
);
