/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLazyPageObject, type KibanaUrl, type ScoutPage } from '@kbn/scout-oblt';
import { testData } from '../..';
import { DependenciesTab } from './dependencies_tab';
import { BIGGER_TIMEOUT } from '../../constants';

export class ServiceDetailsPage {
  public readonly SERVICE_NAME = 'opbeans-java';

  public readonly dependenciesTab: DependenciesTab;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.dependenciesTab = createLazyPageObject(
      DependenciesTab,
      this.page,
      this.kbnUrl,
      this.SERVICE_NAME
    );
  }

  public async goToPage(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    const urlServiceName = encodeURIComponent(overrides.serviceName ?? this.SERVICE_NAME);

    await this.page.goto(
      `${this.kbnUrl.app('apm')}/services/${urlServiceName}?${new URLSearchParams({
        rangeFrom: overrides.rangeFrom ?? testData.OPBEANS_START_DATE,
        rangeTo: overrides.rangeTo ?? testData.OPBEANS_END_DATE,
      })}`
    );
    await this.page.getByRole('tablist').waitFor({ timeout: BIGGER_TIMEOUT });
  }
}
