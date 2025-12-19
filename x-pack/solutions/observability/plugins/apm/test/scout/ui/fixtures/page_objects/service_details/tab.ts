/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { testData } from '../..';

export type ServiceDetailsPageTabName =
  | 'overview'
  | 'transactions'
  | 'dependencies'
  | 'errors'
  | 'metrics'
  | 'infrastructure'
  | 'service-map'
  | 'logs'
  | 'alerts'
  | 'dashboards';

export abstract class Tab {
  public abstract readonly tabName: ServiceDetailsPageTabName;
  public abstract readonly tab: Locator;

  constructor(
    protected readonly page: ScoutPage,
    protected readonly kbnUrl: KibanaUrl,
    protected readonly defaultServiceName: string
  ) {}

  protected abstract waitForTabLoad(): Promise<void>;

  public async goToTab(
    overrides: {
      serviceName?: string;
      rangeFrom?: string;
      rangeTo?: string;
    } = {}
  ) {
    const urlServiceName = encodeURIComponent(overrides.serviceName ?? this.defaultServiceName);

    await this.page.goto(
      `${this.kbnUrl.app('apm')}/services/${urlServiceName}/${this.tabName}?${new URLSearchParams({
        rangeFrom: overrides.rangeFrom ?? testData.OPBEANS_START_DATE,
        rangeTo: overrides.rangeTo ?? testData.OPBEANS_END_DATE,
      })}`
    );
    await this.waitForTabLoad();
  }

  public getTab(): Locator {
    return this.tab;
  }

  public async clickTab(opts: { waitForLoad?: boolean } = { waitForLoad: true }) {
    await this.tab.click();

    if (opts.waitForLoad) {
      await this.waitForTabLoad();
    }
  }
}
