/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import type { ServiceFlyoutPage } from './page_objects/service_flyout';

export async function assertFlyoutChartsRendered(
  serviceFlyoutPage: ServiceFlyoutPage,
  ids: string[]
): Promise<void> {
  for (const id of ids) {
    const chart = serviceFlyoutPage.getChartLocator(id);
    await expect(chart).toBeVisible();
    await expect(chart.locator('[data-render-complete="true"]')).toBeVisible();
    await expect(chart.locator('[data-test-subj="embeddable-lens-failure"]')).toBeHidden();
  }
}
