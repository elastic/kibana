/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../lib/object_remover';

const ENTER_KEY = '\uE007';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const pageObjects = getPageObjects(['common', 'header']);
  const retry = getService('retry');
  const toasts = getService('toasts');
  const objectRemover = new ObjectRemover(supertest);

  describe('Maintenance window create form', () => {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('maintenanceWindows');
    });

    after(async () => {
      const { body } = await supertest.get('/internal/alerting/rules/maintenance_window/_find');

      body?.data?.forEach((mw: { id: string }) => {
        objectRemover.add(mw.id, 'rules/maintenance_window', 'alerting', true);
      });

      await objectRemover.removeAll();
    });

    it('should create a maintenance window', async () => {
      await pageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.click('mw-create-button');

      await retry.try(async () => {
        await testSubjects.existOrFail('createMaintenanceWindowForm');
      });

      const nameInput = await testSubjects.find('createMaintenanceWindowFormNameInput');

      await nameInput.click();
      await nameInput.type('Test Maintenance Window');

      // Turn on repeat
      await (await testSubjects.find('createMaintenanceWindowRepeatSwitch')).click();

      await retry.try(async () => {
        await testSubjects.existOrFail('recurringScheduleRepeatSelect');
      });

      // Open the repeat dropdown select
      await (await testSubjects.find('recurringScheduleRepeatSelect')).click();
      // Select custom
      await (await testSubjects.find('recurringScheduleOptionCustom')).click();

      await retry.try(async () => {
        await testSubjects.existOrFail('customRecurringScheduleFrequencySelect');
      });

      // Change interval to 2
      const intervalInput = await testSubjects.find('customRecurringScheduleIntervalInput');

      await intervalInput.click();
      await intervalInput.type('2');

      // Open "every" frequency dropdown
      await (await testSubjects.find('customRecurringScheduleFrequencySelect')).click();
      // Select daily
      await (await testSubjects.find('customFrequencyDaily')).click();
      // Click on "End -> after {X}"
      await (await testSubjects.find('recurrenceEndOptionAfterX')).click();

      await retry.try(async () => {
        await testSubjects.existOrFail('count-field');
      });

      const afterXOccurenceInput = await testSubjects.find('recurringScheduleAfterXOccurenceInput');

      await afterXOccurenceInput.click();
      await afterXOccurenceInput.clearValue();
      await afterXOccurenceInput.type('5');

      await (await testSubjects.find('create-submit')).click();

      await (await testSubjects.find('confirmModalConfirmButton')).click();

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Created maintenance window 'Test Maintenance Window'`);
      });
    });

    it('should create a maintenance window with an alerts scope query', async () => {
      await pageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.click('mw-create-button');

      await retry.try(async () => {
        await testSubjects.existOrFail('createMaintenanceWindowForm');
      });

      const nameInput = await testSubjects.find('createMaintenanceWindowFormNameInput');

      await nameInput.click();
      await nameInput.type('New Maintenance Window');
      // Turn on filters toggle
      await testSubjects.click('maintenanceWindowScopedQuerySwitch');

      await retry.try(async () => {
        await testSubjects.existOrFail('maintenanceWindowScopeQuery');
      });

      const filtersInput = await testSubjects.find('queryInput');
      await filtersInput.click();
      await filtersInput.type('_id: "*"');
      await filtersInput.pressKeys(ENTER_KEY);

      await (await testSubjects.find('create-submit')).click();

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Created maintenance window 'New Maintenance Window'`);
      });
    });

    it('should create a maintenance window with an episode-data filter', async () => {
      await pageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.click('mw-create-button');

      await retry.try(async () => {
        await testSubjects.existOrFail('createMaintenanceWindowForm');
      });

      const nameInput = await testSubjects.find('createMaintenanceWindowFormNameInput');

      await nameInput.click();
      await nameInput.type('MW with episode filter');

      // Turn on episode-data filter toggle
      await testSubjects.click('episodeScopedQuerySwitch');

      await retry.try(async () => {
        await testSubjects.existOrFail('maintenanceWindowEpisodeDataFilterInput');
      });

      const episodeInput = await testSubjects.find('maintenanceWindowEpisodeDataFilterInput');
      await episodeInput.click();
      await episodeInput.type('rule.id: "abc"');
      await episodeInput.pressKeys(ENTER_KEY);

      // With an episode filter set, the "save without filters" modal must NOT appear.
      await (await testSubjects.find('create-submit')).click();

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Created maintenance window 'MW with episode filter'`);
      });
    });
  });
};
