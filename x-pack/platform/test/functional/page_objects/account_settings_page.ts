/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class AccountSettingsPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly userMenu = this.ctx.getService('userMenu');

  async verifyAccountSettings(expectedUserName: string) {
    await this.userMenu.clickProvileLink();

    const usernameField = await this.testSubjects.find('username');
    const userName = await usernameField.getVisibleText();
    expect(userName).to.be(expectedUserName);

    await this.userMenu.closeMenu();
  }

  async changePassword(currentPassword: string, newPassword: string) {
    await this.testSubjects.click('openChangePasswordForm');

    const currentPasswordInput = await this.find.byName('current_password');
    await currentPasswordInput.clearValue();
    await currentPasswordInput.type(currentPassword);

    const passwordInput = await this.find.byName('password');
    await passwordInput.clearValue();
    await passwordInput.type(newPassword);

    const confirmPasswordInput = await this.find.byName('confirm_password');
    await confirmPasswordInput.clearValue();
    await confirmPasswordInput.type(newPassword);

    await this.testSubjects.click('changePasswordFormSubmitButton');

    const toast = await this.testSubjects.find('euiToastHeader');
    const title = await toast.getVisibleText();
    expect(title).to.contain('Password successfully changed');
  }
}
