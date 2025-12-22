/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';

type AddRuleFlyoutStep = 'definition' | 'actions' | 'details';

export class AddRuleFlyout {
  public readonly flyout: Locator;
  public readonly steps: Locator;
  public readonly saveButton: Locator;

  public readonly isAboveExpression: Locator;

  constructor(private readonly page: ScoutPage) {
    this.flyout = this.page.getByRole('dialog');
    this.steps = this.flyout.getByTestId('addRuleFlyoutSteps');
    this.saveButton = this.flyout.getByTestId('ruleFlyoutFooterSaveButton');

    this.isAboveExpression = this.flyout.getByTestId('apmIsAboveExpression');
  }

  public async waitForErrorCountToLoad() {
    await this.flyout.getByRole('heading', { name: 'Error count threshold' }).waitFor();
  }

  public async fillIsAbove(amount: number) {
    await this.isAboveExpression.click();
    await this.flyout.getByTestId('apmIsAboveFieldFieldNumber').fill(amount.toString());
  }

  public async jumpToStep(step: AddRuleFlyoutStep) {
    await this.steps.getByTestId(`ruleFormStep-${step}`).click();
  }

  public async saveRule(opts: { saveEmptyActions?: boolean } = {}) {
    await this.saveButton.click();

    if (opts.saveEmptyActions) {
      await this.page.getByTestId('confirmModalConfirmButton').click();
    }

    await this.flyout.waitFor({ state: 'hidden' });
  }
}
