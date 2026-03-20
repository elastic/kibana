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
  public readonly saveButton: Locator;

  public readonly isAboveExpression: Locator;
  public readonly isAboveInput: Locator;

  public readonly scheduleValueInput: Locator;
  public readonly scheduleUnitSelect: Locator;

  public readonly nameInput: Locator;

  constructor(private readonly page: ScoutPage) {
    this.flyout = this.page.getByRole('dialog');
    this.saveButton = this.flyout.getByTestId('ruleFlyoutFooterSaveButton');

    this.isAboveExpression = this.flyout.getByTestId('apmIsAboveExpression');
    this.isAboveInput = this.flyout.getByTestId('apmIsAboveFieldFieldNumber');

    this.scheduleValueInput = this.flyout.getByTestId('ruleScheduleNumberInput');
    this.scheduleUnitSelect = this.flyout.getByTestId('ruleScheduleUnitInput');

    this.nameInput = this.flyout.getByTestId('ruleDetailsNameInput');
  }

  public async waitForErrorCountToLoad() {
    await this.flyout.getByRole('heading', { name: 'Error count threshold' }).waitFor();
  }

  public async fillName(name: string) {
    await this.nameInput.clear();
    await this.nameInput.fill(name);
  }

  public async fillIsAbove(amount: number) {
    await this.isAboveExpression.waitFor();
    await this.isAboveExpression.click();
    await this.isAboveInput.fill(amount.toString());
  }

  public async fillRuleSchedule(value: number, unit: 's' | 'm' | 'h' | 'd') {
    await this.scheduleValueInput.fill(value.toString());
    await this.scheduleUnitSelect.selectOption(unit);
  }

  public async jumpToStep(step: AddRuleFlyoutStep) {
    await this.page.getByTestId(`ruleFormStep-${step}`).click();
  }

  public async saveRule(opts: { saveEmptyActions?: boolean } = {}) {
    await this.saveButton.click();

    if (opts.saveEmptyActions) {
      await this.page.getByTestId('confirmModalConfirmButton').click();
    }

    await this.flyout.waitFor({ state: 'hidden' });
  }
}
