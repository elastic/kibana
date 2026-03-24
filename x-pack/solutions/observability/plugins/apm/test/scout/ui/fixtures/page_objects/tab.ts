/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';

export abstract class Tab {
  public abstract readonly tabName: string;
  public abstract readonly tab: Locator;

  constructor(protected readonly page: ScoutPage, protected readonly kbnUrl: KibanaUrl) {}

  protected abstract waitForTabLoad(): Promise<void>;

  public abstract goToTab(): Promise<void>;

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
