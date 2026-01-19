/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class SpaceSelectorPageObject extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly log = this.ctx.getService('log');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly browser = this.ctx.getService('browser');
  private readonly find = this.ctx.getService('find');
  private readonly common = this.ctx.getPageObject('common');

  async initTests() {
    this.log.debug('SpaceSelectorPage:initTests');
  }

  async clickSpaceCard(spaceId: string) {
    await this.common.sleep(10000);
    return await this.retry.try(async () => {
      this.log.info(`SpaceSelectorPage:clickSpaceCard(${spaceId})`);
      await this.testSubjects.click(`space-card-${spaceId}`);
      await this.common.sleep(1000);
    });
  }

  async getSpaceCardAnchor(spaceId: string) {
    return await this.retry.try(async () => {
      this.log.info(`SpaceSelectorPage:getSpaceCardAnchor(${spaceId})`);
      const testSubjId = `space-card-${spaceId}`;
      const anchorElement = await this.find.byCssSelector(
        `[data-test-subj="${testSubjId}"] .euiCard__titleAnchor`
      );

      return anchorElement;
    });
  }

  async expectHomePage(spaceId: string) {
    return await this.expectRoute(spaceId, `/app/home#/`);
  }

  async expectRoute(spaceId: string, route: string) {
    return await this.retry.try(async () => {
      this.log.debug(`expectRoute(${spaceId}, ${route})`);
      await this.find.byCssSelector('[data-test-subj="kibanaChrome"] nav:not(.ng-hide) ', 20000);
      const url = await this.browser.getCurrentUrl();
      this.log.debug(`URL: ${url})`);
      if (spaceId === 'default') {
        expect(url).to.contain(route);
      } else {
        expect(url).to.contain(`/s/${spaceId}${route}`);
      }
      await this.common.sleep(1000);
    });
  }

  async expectSpace(spaceId: string) {
    return await this.retry.try(async () => {
      this.log.debug(`expectSpace(${spaceId}`);
      await this.find.byCssSelector('[data-test-subj="kibanaChrome"] nav:not(.ng-hide) ', 20000);
      const url = await this.browser.getCurrentUrl();
      this.log.debug(`URL: ${url})`);
      if (spaceId === 'default') {
        expect(url).to.not.contain(`/s/${spaceId}`);
      } else {
        expect(url).to.contain(`/s/${spaceId}`);
      }
      await this.common.sleep(1000);
    });
  }

  async openSpacesNav() {
    this.log.debug('openSpacesNav()');
    return await this.retry.try(async () => {
      await this.testSubjects.click('spacesNavSelector');
      await this.find.byCssSelector('#headerSpacesMenuContent');
      await this.common.sleep(1000);
    });
  }

  async clickManageSpaces() {
    await this.testSubjects.click('manageSpaces');
  }

  async clickCreateSpace() {
    await this.testSubjects.click('createSpace');
  }

  async clickEnterSpaceName() {
    await this.testSubjects.click('addSpaceName');
  }

  async addSpaceName(spaceName: string) {
    await this.testSubjects.setValue('addSpaceName', spaceName);
  }

  async clickCustomizeSpaceAvatar(spaceId: string) {
    await this.testSubjects.click(`space-avatar-${spaceId}`);
  }

  async clickSpaceInitials() {
    await this.testSubjects.click('spaceLetterInitial');
  }

  async addSpaceInitials(spaceInitials: string) {
    await this.testSubjects.setValue('spaceLetterInitial', spaceInitials);
  }

  async clickColorPicker() {
    await this.testSubjects.click('euiColorPickerAnchor');
  }

  async setColorinPicker(hexValue: string) {
    await this.testSubjects.setValue('euiColorPickerAnchor', hexValue);
  }

  async openSolutionViewSelect() {
    const solutionViewSelect = await this.testSubjects.find('solutionViewSelect');
    const classes = await solutionViewSelect.getAttribute('class');

    const isOpen = classes?.includes('isOpen') ?? false;
    if (!isOpen) {
      await solutionViewSelect.click();
    }
  }

  async changeSolutionView(solution: 'es' | 'oblt' | 'security' | 'classic') {
    await this.openSolutionViewSelect();
    const serialized = solution.charAt(0).toUpperCase() + solution.slice(1);
    await this.testSubjects.click(`solutionView${serialized}Option`);
  }

  async clickShowFeatures() {
    await this.testSubjects.click('show-hide-section-link');
  }

  async clickChangeAllPriv() {
    await this.testSubjects.click('changeAllPrivilegesButton');
  }

  async clickSaveSpaceCreation() {
    await this.testSubjects.click('save-space-button');
  }

  async clickSpaceEditButton(spaceName: string) {
    await this.testSubjects.click(`${spaceName}-editSpace`);
  }

  async clickGoToRolesPage() {
    await this.testSubjects.click('rolesManagementPage');
  }

  async clickCancelSpaceCreation() {
    await this.testSubjects.click('cancel-space-button');
  }

  async clickOnCustomizeURL() {
    await this.testSubjects.click('CustomizeOrReset');
  }

  async clickOnSpaceURLDisplay() {
    await this.testSubjects.click('spaceURLDisplay');
  }

  async setSpaceURL(spaceURL: string) {
    await this.testSubjects.setValue('spaceURLDisplay', spaceURL);
  }

  async clickHideAllFeatures() {
    await this.testSubjects.click('spc-toggle-all-features-hide');
  }

  async clickShowAllFeatures() {
    await this.testSubjects.click('spc-toggle-all-features-show');
  }

  async openFeatureCategory(categoryName: string) {
    const category = await this.find.byCssSelector(
      `button[aria-controls=featureCategory_${categoryName}]`
    );
    const isCategoryExpanded = (await category.getAttribute('aria-expanded')) === 'true';
    if (!isCategoryExpanded) {
      await category.click();
    }
  }

  async closeFeatureCategory(categoryName: string) {
    const category = await this.find.byCssSelector(
      `button[aria-controls=featureCategory_${categoryName}]`
    );
    const isCategoryExpanded = (await category.getAttribute('aria-expanded')) === 'true';
    if (isCategoryExpanded) {
      await category.click();
    }
  }

  async toggleFeatureCategoryVisibility(categoryName: string) {
    await this.testSubjects.click(`featureCategoryButton_${categoryName}`);
  }

  async toggleFeatureCategoryCheckbox(categoryName: string) {
    await this.testSubjects.click(`featureCategoryCheckbox_${categoryName}`);
  }

  async getFeatureCheckboxState(featureId: string) {
    return await this.testSubjects.isChecked(`featureCheckbox_${featureId}`);
  }

  async clickOnDescriptionOfSpace() {
    await this.testSubjects.click('descriptionSpaceText');
  }

  async setOnDescriptionOfSpace(descriptionSpace: string) {
    await this.testSubjects.setValue('descriptionSpaceText', descriptionSpace);
  }

  async clickSwitchSpaceButton(spaceName: string) {
    const collapsedButtonSelector = '[data-test-subj=euiCollapsedItemActionsButton]';
    // open context menu
    await this.find.clickByCssSelector(`#${spaceName}-actions ${collapsedButtonSelector}`);
    // click context menu item
    await this.find.clickByCssSelector(
      `.euiContextMenuItem[data-test-subj="${spaceName}-switchSpace"]` // can not use testSubj: multiple elements exist with the same data-test-subj
    );
  }

  async clickOnDeleteSpaceButton(spaceName: string) {
    const collapsedButtonSelector = '[data-test-subj=euiCollapsedItemActionsButton]';
    // open context menu
    await this.find.clickByCssSelector(`#${spaceName}-actions ${collapsedButtonSelector}`);
    // click context menu item
    await this.testSubjects.click(`${spaceName}-deleteSpace`);
  }

  async cancelDeletingSpace() {
    await this.testSubjects.click('confirmModalCancelButton');
  }

  async confirmDeletingSpace() {
    await this.testSubjects.click('confirmModalConfirmButton');
  }

  // Generic for any confirm modal
  async confirmModal() {
    await this.testSubjects.click('confirmModalConfirmButton');
  }

  async clickOnSpaceb() {
    await this.testSubjects.click('space-avatar-space_b');
  }

  async goToSpecificSpace(spaceId: string) {
    return await this.retry.try(async () => {
      this.log.info(`SpaceSelectorPage:goToSpecificSpace(${spaceId})`);
      await this.testSubjects.click(`${spaceId}-selectableSpaceItem`);
      await this.common.sleep(1000);
      expect(await this.find.existsByCssSelector('#headerSpacesMenuContent')).to.be(false);
    });
  }

  async clickSpaceAvatar(spaceId: string) {
    return await this.retry.try(async () => {
      this.log.info(`SpaceSelectorPage:clickSpaceAvatar(${spaceId})`);
      await this.testSubjects.click(`space-avatar-${spaceId}`);
      await this.common.sleep(1000);
    });
  }

  async expectSearchBoxInSpacesSelector() {
    expect(await this.find.existsByCssSelector('div[role="dialog"] input[type="search"]')).to.be(
      true
    );
  }

  async setSearchBoxInSpacesSelector(searchText: string) {
    const searchBox = await this.find.byCssSelector('div[role="dialog"] input[type="search"]');
    await searchBox.clearValue();
    await searchBox.type(searchText);
    await this.common.sleep(1000);
  }

  async expectToFindThatManySpace(numberOfExpectedSpace: number) {
    const spacesFound = await this.find.allByCssSelector('div[role="dialog"] li[role="option"]');
    expect(spacesFound.length).to.be(numberOfExpectedSpace);
  }

  async expectNoSpacesFound() {
    const msgElem = await this.find.byCssSelector(
      'div[role="dialog"] div[data-test-subj="euiSelectableMessage"]'
    );
    expect(await msgElem.getVisibleText()).to.be('no spaces found');
  }

  async currentSelectedSpaceTitle() {
    const spacesNavSelector = await this.testSubjects.find('spacesNavSelector');
    return spacesNavSelector.getAttribute('title');
  }
}
