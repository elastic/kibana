/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Page } from '@elastic/synthetics';
import { Locator, byTestId } from './utils';

export class UXDashboardFilters {
  readonly page: Page;
  readonly percentileSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.percentileSelect = page.locator(byTestId('uxPercentileSelect'));
  }

  getPercentileOption(percentile: '50' | '55' | '90' | '95' | '99') {
    return this.page.locator(byTestId(`p${percentile}Percentile`));
  }
}
