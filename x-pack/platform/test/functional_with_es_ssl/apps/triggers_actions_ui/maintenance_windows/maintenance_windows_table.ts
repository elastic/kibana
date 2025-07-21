/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../lib/object_remover';
import { generateUniqueKey } from '../../../lib/get_test_data';
import { createMaintenanceWindow } from './utils';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const pageObjects = getPageObjects(['common', 'maintenanceWindows', 'header']);
  const retry = getService('retry');
  const toasts = getService('toasts');
  const objectRemover = new ObjectRemover(supertest);
  const browser = getService('browser');

  describe('Maintenance windows table', function () {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('maintenanceWindows');
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('should cancel a running maintenance window', async () => {
      const name = generateUniqueKey();
      const createdMaintenanceWindow = await createMaintenanceWindow({
        name,
        getService,
      });
      objectRemover.add(createdMaintenanceWindow.id, 'rules/maintenance_window', 'alerting', true);
      await browser.refresh();

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      let list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Running');

      await testSubjects.click('table-actions-popover');
      await testSubjects.click('table-actions-cancel');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Cancelled running maintenance window '${name}'`);
      });

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.not.eql('Running');
    });

    it('should archive finished maintenance window', async () => {
      const name = generateUniqueKey();
      const createdMaintenanceWindow = await createMaintenanceWindow({
        name,
        startDate: new Date('05-01-2023'),
        notRecurring: true,
        getService,
      });
      objectRemover.add(createdMaintenanceWindow.id, 'rules/maintenance_window', 'alerting', true);
      await browser.refresh();

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      let list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Finished');

      await testSubjects.click('table-actions-popover');
      await testSubjects.click('table-actions-archive');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Archived maintenance window '${name}'`);
      });

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Archived');
    });

    it('should cancel and archive a running maintenance window', async () => {
      const name = generateUniqueKey();
      const createdMaintenanceWindow = await createMaintenanceWindow({
        name,
        getService,
      });
      objectRemover.add(createdMaintenanceWindow.id, 'rules/maintenance_window', 'alerting', true);
      await browser.refresh();

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      let list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Running');

      await testSubjects.click('table-actions-popover');
      await testSubjects.click('table-actions-cancel-and-archive');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Cancelled and archived running maintenance window '${name}'`);
      });

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Archived');
    });

    it('should unarchive a maintenance window', async () => {
      const name = generateUniqueKey();
      const createdMaintenanceWindow = await createMaintenanceWindow({
        name,
        startDate: new Date('05-01-2023'),
        notRecurring: true,
        getService,
      });
      objectRemover.add(createdMaintenanceWindow.id, 'rules/maintenance_window', 'alerting', true);
      await browser.refresh();

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      let list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Finished');

      await testSubjects.click('table-actions-popover');
      await testSubjects.click('table-actions-archive');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Archived maintenance window '${name}'`);
      });

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Archived');

      await testSubjects.click('table-actions-popover');
      await testSubjects.click('table-actions-unarchive');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Unarchived maintenance window '${name}'`);
      });

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Finished');
    });

    it('should filter maintenance windows by the status', async () => {
      const running = await createMaintenanceWindow({
        name: 'running-mw',
        getService,
      });
      objectRemover.add(running.id, 'rules/maintenance_window', 'alerting', true);
      const finished = await createMaintenanceWindow({
        name: 'finished-mw',
        startDate: new Date('05-01-2023'),
        notRecurring: true,
        getService,
      });
      objectRemover.add(finished.id, 'rules/maintenance_window', 'alerting', true);

      const date = new Date();
      date.setDate(date.getDate() + 1);
      const upcoming = await createMaintenanceWindow({
        name: 'upcoming-mw',
        startDate: date,
        getService,
      });
      objectRemover.add(upcoming.id, 'rules/maintenance_window', 'alerting', true);
      await browser.refresh();

      await pageObjects.maintenanceWindows.searchMaintenanceWindows('mw');

      const list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(3);

      await testSubjects.click('status-filter-button');
      await testSubjects.click('status-filter-upcoming'); // select Upcoming status filter
      await retry.try(async () => {
        const upcomingList = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
        expect(upcomingList.length).to.equal(1);
        expect(upcomingList[0].status).to.equal('Upcoming');
      });
    });

    it('should filter maintenance windows by the archived status', async () => {
      const finished = await createMaintenanceWindow({
        name: 'finished-maintenance-window',
        startDate: new Date('05-01-2023'),
        notRecurring: true,
        getService,
      });
      objectRemover.add(finished.id, 'rules/maintenance_window', 'alerting', true);

      const date = new Date();
      date.setDate(date.getDate() + 1);
      const upcoming = await createMaintenanceWindow({
        name: 'upcoming-maintenance-window',
        startDate: date,
        getService,
      });
      objectRemover.add(upcoming.id, 'rules/maintenance_window', 'alerting', true);

      const archived = await createMaintenanceWindow({
        name: 'archived-maintenance-window',
        getService,
      });
      objectRemover.add(archived.id, 'rules/maintenance_window', 'alerting', true);
      await browser.refresh();

      await pageObjects.maintenanceWindows.searchMaintenanceWindows('window');

      const list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(3);
      expect(list[0].status).to.eql('Running');

      await testSubjects.click('table-actions-popover');
      await testSubjects.click('table-actions-cancel-and-archive');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(
          `Cancelled and archived running maintenance window 'archived-maintenance-window'`
        );
      });

      await testSubjects.click('status-filter-button');
      await testSubjects.click('status-filter-archived'); // select Archived status filter

      await retry.try(async () => {
        const archivedList = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
        expect(archivedList.length).to.equal(1);
        expect(archivedList[0].status).to.equal('Archived');
      });
    });

    it('paginates maintenance windows correctly', async () => {
      new Array(12).fill(null).map(async (_, index) => {
        const mw = await createMaintenanceWindow({
          name: index + '-pagination',
          getService,
        });
        objectRemover.add(mw.id, 'rules/maintenance_window', 'alerting', true);
      });
      await browser.refresh();

      await pageObjects.maintenanceWindows.searchMaintenanceWindows('pagination');
      await pageObjects.maintenanceWindows.getMaintenanceWindowsList();

      await testSubjects.click('tablePaginationPopoverButton');
      await testSubjects.click('tablePagination-25-rows');
      await testSubjects.missingOrFail('pagination-button-1');
      await testSubjects.click('tablePaginationPopoverButton');
      await testSubjects.click('tablePagination-10-rows');
      const listedOnFirstPageMWs = await testSubjects.findAll('list-item');
      expect(listedOnFirstPageMWs.length).to.be(10);

      await testSubjects.isEnabled('pagination-button-1');
      await testSubjects.click('pagination-button-1');
      await testSubjects.isEnabled('pagination-button-0');
      const listedOnSecondPageMWs = await testSubjects.findAll('list-item');
      expect(listedOnSecondPageMWs.length).to.be(2);
    });

    it('should delete a maintenance window', async () => {
      const name = generateUniqueKey();
      await createMaintenanceWindow({
        name,
        getService,
      });

      await browser.refresh();
      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      const listBefore = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(listBefore.length).to.eql(1);

      await testSubjects.click('table-actions-popover');
      await testSubjects.click('table-actions-delete');

      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql('Deleted maintenance window');
      });

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      const listAfter = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(listAfter.length).to.eql(0);
    });
  });
};
