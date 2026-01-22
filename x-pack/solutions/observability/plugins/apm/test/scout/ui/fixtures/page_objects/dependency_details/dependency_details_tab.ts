/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { testData } from '../..';
import { Tab } from '../tab';

export type DependencyDetailsPageTabName = 'overview' | 'operations';

export abstract class DependencyDetailsTab extends Tab {
  public abstract readonly tabName: DependencyDetailsPageTabName;

  constructor(
    page: ScoutPage,
    kbnUrl: KibanaUrl,
    protected readonly defaultDependencyName: string
  ) {
    super(page, kbnUrl);
  }

  public async goToTab(
    overrides: {
      serviceName?: string;
      rangeFrom?: string;
      rangeTo?: string;
    } = {}
  ) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/dependencies/${this.tabName}?${new URLSearchParams({
        dependencyName: this.defaultDependencyName,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
        ...overrides,
      })}`
    );
    await this.waitForTabLoad();
  }
}
