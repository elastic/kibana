/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Page } from '@elastic/synthetics';
import { Locator, byTestId } from './utils';

const DEFAULT_ABS_START_UTC_DATE = '2022-05-22T19:00:00.000Z';
const DEFAULT_ABS_END_UTC_DATE = '2022-05-22T20:00:00.000Z';
const MOMENT_DATE_INPUT_FORMAT = 'MMM DD, YYYY @ HH:mm:ss:SSS';

export class UXDashboardDatePicker {
  readonly page: Page;
  readonly dateStarButton: Locator;
  readonly dateEndButton: Locator;
  readonly datePopupAbsoluteTab: Locator;
  readonly dateAbsoluteInput: Locator;
  readonly dateApplyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dateStarButton = page.locator('.euiDatePopoverButton--start');
    this.dateEndButton = page.locator('.euiDatePopoverButton--end');
    this.datePopupAbsoluteTab = page.locator('text=Absolute');
    this.dateAbsoluteInput = page.locator(
      byTestId('superDatePickerAbsoluteDateInput')
    );
    this.dateApplyButton = page.locator(
      byTestId('superDatePickerApplyTimeButton')
    );
  }

  async setAbsoluteStartDate(dateStr: string) {
    await this.dateStarButton.first().click({ timeout: 3 * 60 * 1000 });
    await this.datePopupAbsoluteTab.first().click();
    await this.dateAbsoluteInput.first().click({ clickCount: 3 }); // clear input
    await this.dateAbsoluteInput.first().type(dateStr);
  }

  async setAbsoluteEndDate(dateStr: string) {
    await this.dateEndButton.first().click();
    await this.datePopupAbsoluteTab.first().click();
    await this.dateAbsoluteInput.first().click({ clickCount: 3 }); // clear input
    await this.dateAbsoluteInput.first().type(dateStr);
  }

  async applyDate() {
    await this.dateApplyButton.click();
  }

  async setDefaultE2eRange() {
    const startDateStr = moment(DEFAULT_ABS_START_UTC_DATE).format(
      MOMENT_DATE_INPUT_FORMAT
    );
    await this.setAbsoluteStartDate(startDateStr);

    const endDateStr = moment(DEFAULT_ABS_END_UTC_DATE).format(
      MOMENT_DATE_INPUT_FORMAT
    );
    await this.setAbsoluteEndDate(endDateStr);

    await this.applyDate();
  }
}
