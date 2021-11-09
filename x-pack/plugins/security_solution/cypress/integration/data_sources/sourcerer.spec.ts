/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loginAndWaitForPage,
  loginWithUserAndWaitForPageWithoutDateRange,
} from '../../tasks/login';

import { HOSTS_URL } from '../../urls/navigation';
import {
  isKibanaDataViewOption,
  isDataViewSelection,
  isHostsStatValue,
  isSourcererOptions,
  isSourcererSelection,
  openAdvancedSettings,
  openSourcerer,
  resetSourcerer,
  saveSourcerer,
  deselectSourcererOptions,
  addIndexToDefault,
  isNotSourcererSelection,
  deselectSourcererOption,
  openDataViewSelection,
} from '../../tasks/sourcerer';
import { cleanKibana, postDataView, waitForPageToBeLoaded } from '../../tasks/common';
import { createUsersAndRoles, secReadCasesAll, secReadCasesAllUser } from '../../tasks/privileges';
import { TOASTER } from '../../screens/configure_cases';
import { DEFAULT_INDEX_PATTERN } from '../../../common/constants';
import { SOURCERER } from '../../screens/sourcerer';

const usersToCreate = [secReadCasesAllUser];
const rolesToCreate = [secReadCasesAll];
const siemDataViewTitle = 'Security Default Data View';
const dataViews = ['auditbeat-*,fakebeat-*', 'auditbeat-*,beats*,siem-read*,.kibana*,fakebeat-*'];
// Skipped at the moment as this has flake due to click handler issues. This has been raised with team members
// and the code is being re-worked and then these tests will be unskipped
describe('Sourcerer', () => {
  beforeEach(() => {
    cleanKibana();
    dataViews.forEach((dataView: string) => postDataView(dataView));
  });
  describe('permissions', () => {
    before(() => {
      createUsersAndRoles(usersToCreate, rolesToCreate);
    });
    it(`role(s) ${secReadCasesAllUser.roles.join()} shows error when user does not have permissions`, () => {
      loginWithUserAndWaitForPageWithoutDateRange(HOSTS_URL, secReadCasesAllUser);
      cy.get(TOASTER).should('have.text', 'Write role required to generate data');
    });
  });

  describe('Default scope', () => {
    beforeEach(() => {
      cy.clearLocalStorage();
      loginAndWaitForPage(HOSTS_URL);
    });

    it('correctly loads SIEM data view', () => {
      openSourcerer();
      isDataViewSelection(siemDataViewTitle);
      openAdvancedSettings();
      isSourcererSelection(`auditbeat-*`);
      isSourcererOptions(DEFAULT_INDEX_PATTERN.filter((pattern) => pattern !== 'auditbeat-*'));
    });

    describe('Modified badge', () => {
      it('Selecting new data view does not add a modified badge', () => {
        cy.get(SOURCERER.badgeModified).should(`not.exist`);
        openSourcerer();
        cy.get(SOURCERER.badgeModifiedOption).should(`not.exist`);
        openDataViewSelection();
        isKibanaDataViewOption(dataViews);
        cy.get(SOURCERER.selectListDefaultOption).should(`contain`, siemDataViewTitle);
        cy.get(SOURCERER.selectListOption).contains(dataViews[1]).click();
        isDataViewSelection(dataViews[1]);
        saveSourcerer();
        cy.get(SOURCERER.badgeModified).should(`not.exist`);
        openSourcerer();
        cy.get(SOURCERER.badgeModifiedOption).should(`not.exist`);
      });

      it('shows modified badge when index patterns change and removes when reset', () => {
        openSourcerer();
        openDataViewSelection();
        cy.get(SOURCERER.selectListOption).contains(dataViews[1]).click();
        isDataViewSelection(dataViews[1]);
        openAdvancedSettings();
        const patterns = dataViews[1].split(',');
        deselectSourcererOptions([patterns[0]]);
        saveSourcerer();
        cy.get(SOURCERER.badgeModified).should(`exist`);
        openSourcerer();
        cy.get(SOURCERER.badgeModifiedOption).should(`exist`);
        resetSourcerer();
        saveSourcerer();
        cy.get(SOURCERER.badgeModified).should(`not.exist`);
        openSourcerer();
        cy.get(SOURCERER.badgeModifiedOption).should(`not.exist`);
        isDataViewSelection(siemDataViewTitle);
      });
    });

    it('disables save when no patterns are selected', () => {
      openSourcerer();
      openAdvancedSettings();
      cy.get(SOURCERER.saveButton).should('be.enabled');
      deselectSourcererOptions(['auditbeat-*']);
      cy.get(SOURCERER.saveButton).should('be.disabled');
    });

    it('adds a pattern to the default index and correctly filters out auditbeat-*', () => {
      openSourcerer();
      isSourcererSelection(`auditbeat-*`);
      isNotSourcererSelection('beats*');
      addIndexToDefault('beats*');
      isHostsStatValue('4 ');
      openSourcerer();
      openAdvancedSettings();
      isSourcererSelection(`auditbeat-*`);
      isSourcererSelection('beats*');
    });
  });
});
