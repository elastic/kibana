/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { faker } from '@faker-js/faker';
import { FtrProviderContext } from '../../../ftr_provider_context';


export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'settings', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const spacesServices = getService('spaces');
  const log = getService('log');
  const find = getService('find');

  describe('Spaces Management: Create and Edit', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('create space', () => {
      const spaceName = `${faker.word.adjective()} space`;
      const spaceId = spaceName.replace(' ', '-');

      before(async () => {
        await PageObjects.common.navigateToApp('spacesManagement');
        await testSubjects.existOrFail('spaces-grid-page');

        await PageObjects.spaceSelector.clickCreateSpace();
        await testSubjects.existOrFail('spaces-create-page');
      });

      after(async () => {
        await spacesServices.delete(spaceId);
      });

      it('create a space with a given name', async () => {
        await PageObjects.spaceSelector.addSpaceName(spaceName);
        await PageObjects.spaceSelector.changeSolutionView('classic');
        await PageObjects.spaceSelector.clickSaveSpaceCreation();
        await testSubjects.existOrFail(`spacesListTableRow-${spaceId}`);
      });
    });

    describe('edit space', () => {
      const spaceName = `${faker.word.adjective()} space`;
      const spaceId = spaceName.replace(' ', '-');

      before(async () => {
        log.debug(`Creating space named "${spaceName}" with ID "${spaceId}"`);

        await spacesServices.create({
          id: spaceId,
          name: spaceName,
          disabledFeatures: [],
          color: '#AABBCC',
          solution: 'classic',
        });

        await PageObjects.common.navigateToApp('spacesManagement');
        await testSubjects.existOrFail('spaces-grid-page');
      });

      after(async () => {
        await spacesServices.delete(spaceId);
      });

      it('allows changing space initials', async () => {
        const spaceInitials = faker.string.alpha(2);

        await testSubjects.click(`${spaceId}-hyperlink`);
        await testSubjects.existOrFail('spaces-view-page > generalPanel');

        await testSubjects.setValue('spaceLetterInitial', spaceInitials);
        await testSubjects.click('save-space-button');

        await testSubjects.existOrFail('spaces-grid-page'); // wait for grid page to reload
        await testSubjects.existOrFail(`space-avatar-${spaceId}`);
        expect(await testSubjects.getVisibleText(`space-avatar-${spaceId}`)).to.be(spaceInitials);
      });

      it('allows changing space avatar', async () => {
        await testSubjects.click(`${spaceId}-hyperlink`);
        await testSubjects.existOrFail('spaces-view-page > generalPanel');

        await testSubjects.click('image');

        const avatarPath = require.resolve('./acme_logo.png');
        log.debug(`Importing file '${avatarPath}' ...`);
        await PageObjects.common.setFileInputPath(avatarPath);

        await testSubjects.click('save-space-button');
        await testSubjects.existOrFail('spaces-grid-page'); // wait for grid page to reload
        await testSubjects.existOrFail(`space-avatar-${spaceId}`);
        const avatarEl = await testSubjects.find(`space-avatar-${spaceId}`);
        expect(await avatarEl.getAttribute('role')).to.be('img'); // expect that the space uses image avatar
      });
    });

    describe('solution view', () => {
      it('does show the solution view panel', async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/edit/default', {
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail('spaces-view-page');
        await testSubjects.existOrFail('spaces-view-page > generalPanel');
        await testSubjects.existOrFail('spaces-view-page > navigationPanel');
      });

      it('changes the space solution and updates the side navigation', async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/edit/default', {
          shouldUseHashForSubUrl: false,
        });

        // Make sure we are on the classic side nav
        await testSubjects.existOrFail('mgtSideBarNav');
        await testSubjects.missingOrFail('searchSideNav');

        // change to Enterprise Search
        await PageObjects.spaceSelector.changeSolutionView('es');
        await PageObjects.spaceSelector.clickSaveSpaceCreation();
        await PageObjects.spaceSelector.confirmModal();

        await find.waitForDeletedByCssSelector('.kibanaWelcomeLogo');

        // Search side nav is loaded
        await testSubjects.existOrFail('searchSideNav');
        await testSubjects.missingOrFail('mgtSideBarNav');

        // change back to classic
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/edit/default', {
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.missingOrFail('space-edit-page-user-impact-warning');
        await PageObjects.spaceSelector.changeSolutionView('classic');
        await testSubjects.existOrFail('space-edit-page-user-impact-warning'); // Warn that the change will impact other users

        await PageObjects.spaceSelector.clickSaveSpaceCreation();
        await PageObjects.spaceSelector.confirmModal();

        await testSubjects.existOrFail('mgtSideBarNav');
        await testSubjects.missingOrFail('searchSideNav');
      });
    });

    describe('API-created Space', () => {
      before(async () => {
        await spacesServices.create({
          id: 'foo-space',
          name: 'Foo Space',
          disabledFeatures: [],
          color: '#AABBCC',
        });
      });

      after(async () => {
        await spacesServices.delete('foo-space');
      });

      it('enabled features can be changed while the solution view remains unselected', async () => {
        const securityFeatureCheckboxId = 'featureCategoryCheckbox_securitySolution';

        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/edit/foo-space', {
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail('spaces-view-page');

        // ensure security feature is selected by default
        expect(await testSubjects.isChecked(securityFeatureCheckboxId)).to.be(true);

        // Do not set a solution view first!

        await PageObjects.spaceSelector.toggleFeatureCategoryCheckbox('securitySolution');
        //
        // ensure security feature now unselected
        expect(await testSubjects.isChecked(securityFeatureCheckboxId)).to.be(false);

        await testSubjects.existOrFail('space-edit-page-user-impact-warning');

        await PageObjects.spaceSelector.clickSaveSpaceCreation();

        await testSubjects.click('confirmModalConfirmButton');

        await testSubjects.existOrFail('spaces-view-page');

        await testSubjects.click('foo-space-hyperlink');

        await testSubjects.existOrFail('spaces-view-page');

        // ensure security feature is still unselected
        expect(await testSubjects.isChecked(securityFeatureCheckboxId)).to.be(false);
      });
    });
  });
}
