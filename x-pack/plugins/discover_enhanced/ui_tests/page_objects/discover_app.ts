/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Page } from 'playwright/test';
import { KibanaUrl } from '../fixtures/kibana_url';
import { boxedStep } from '.';

export class DiscoverApp {
  constructor(private readonly page: Page, private readonly kbnUrl: KibanaUrl) {}

  @boxedStep
  async goto() {
    await this.page.goto(this.kbnUrl.app('discover'));
  }
}
