/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { testData } from '../..';
import { Tab } from '../tab';

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

export abstract class ServiceDetailsTab extends Tab {
  public abstract readonly tabName: ServiceDetailsPageTabName;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, protected readonly defaultServiceName: string) {
    super(page, kbnUrl);
  }

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
        rangeFrom: overrides.rangeFrom ?? testData.START_DATE,
        rangeTo: overrides.rangeTo ?? testData.END_DATE,
      })}`
    );
    await this.waitForTabLoad();
  }
}
