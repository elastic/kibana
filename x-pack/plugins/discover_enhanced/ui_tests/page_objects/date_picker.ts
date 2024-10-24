/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, Page } from '@playwright/test';
import { subj } from '@kbn/test-subj-selector';
import { boxedStep } from '.';

export class DatePicker {
  constructor(private readonly page: Page) {}

  @boxedStep
  async setAbsoluteRange(fromTime: string, toTime: string) {
    await this.page.click(subj('superDatePickerShowDatesButton'));
    // we start with end date
    await this.page.click(subj('superDatePickerendDatePopoverButton'));
    await this.page.click(subj('superDatePickerAbsoluteTab'));
    const inputFrom = this.page.locator(subj('superDatePickerAbsoluteDateInput'));
    await inputFrom.clear();
    await inputFrom.fill(toTime);
    await this.page.click(subj('parseAbsoluteDateFormat'));
    await this.page.click(subj('superDatePickerendDatePopoverButton'));
    // and later change start date
    await this.page.click(subj('superDatePickerstartDatePopoverButton'));
    await this.page.click(subj('superDatePickerAbsoluteTab'));
    const inputTo = this.page.locator(subj('superDatePickerAbsoluteDateInput'));
    await inputTo.clear();
    await inputTo.fill(fromTime);
    await this.page.click(subj('parseAbsoluteDateFormat'));
    await this.page.keyboard.press('Escape');

    await expect(this.page.locator(subj('superDatePickerstartDatePopoverButton'))).toHaveText(
      fromTime
    );
    await expect(this.page.locator(subj('superDatePickerendDatePopoverButton'))).toHaveText(toTime);
    await this.page.click(subj('querySubmitButton'));
  }
}
