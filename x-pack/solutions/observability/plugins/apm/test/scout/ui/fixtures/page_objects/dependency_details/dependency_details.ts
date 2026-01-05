/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLazyPageObject, type KibanaUrl, type ScoutPage } from '@kbn/scout-oblt';
import { testData } from '../..';
import { OverviewTab } from './overview_tab';
import { OperationsTab } from './operations_tab';
import { OperationDetailSubpage } from './operation_detail';
import { EXTENDED_TIMEOUT } from '../../constants';

export class DependencyDetailsPage {
  public readonly DEPENDENCY_NAME = 'postgresql';
  public readonly SPAN_NAME = 'SELECT * FROM product';

  public readonly overviewTab: OverviewTab;
  public readonly operationsTab: OperationsTab;
  public readonly operationDetailSubpage: OperationDetailSubpage;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.overviewTab = createLazyPageObject(
      OverviewTab,
      this.page,
      this.kbnUrl,
      this.DEPENDENCY_NAME
    );
    this.operationsTab = createLazyPageObject(
      OperationsTab,
      this.page,
      this.kbnUrl,
      this.DEPENDENCY_NAME
    );
    this.operationDetailSubpage = createLazyPageObject(
      OperationDetailSubpage,
      this.page,
      this.kbnUrl,
      this.DEPENDENCY_NAME,
      this.SPAN_NAME
    );
  }

  public async goToPage(overrides?: {
    dependencyName?: string;
    rangeFrom?: string;
    rangeTo?: string;
  }) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/dependencies?${new URLSearchParams({
        dependencyName: this.DEPENDENCY_NAME,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
        ...overrides,
      })}`
    );
    await this.page.getByRole('tablist').waitFor({ timeout: EXTENDED_TIMEOUT });
  }
}
