/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseSeverity, CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import type { UserProfile } from '@kbn/core-user-profile-common';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '../../../../cases_api_integration/common/lib/authentication';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { users, roles } from '../common';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const browser = getService('browser');
  const toasts = getService('toasts');

  describe('cases list', () => {
    before(async () => {
      await cases.api.deleteAllCases();
      await cases.navigation.navigateToApp();
    });

    after(async () => {
      await cases.api.deleteAllCases();
      await cases.casesTable.waitForCasesToBeDeleted();
    });

    describe('empty state', () => {
      it('displays an empty list with an add button correctly', async () => {
        await testSubjects.existOrFail('cases-list-add-case');
      });
    });

    describe('listing', () => {
      before(async () => {
        await cases.api.createNthRandomCases(2);
        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await cases.casesTable.waitForCasesToBeDeleted();
      });

      it('lists cases correctly', async () => {
        await cases.casesTable.validateCasesTableHasNthRows(2);
      });
    });

    describe('bulk actions', () => {
      describe('delete', () => {
        before(async () => {
          await cases.api.createNthRandomCases(8);
          await cases.api.createCase({ title: 'delete me', tags: ['one'] });
          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        after(async () => {
          await cases.api.deleteAllCases();
          await cases.casesTable.waitForCasesToBeDeleted();
        });

        it('bulk delete cases from the list', async () => {
          await cases.casesTable.selectAndDeleteAllCases();
          await cases.casesTable.waitForTableToFinishLoading();
          await cases.casesTable.validateCasesTableHasNthRows(0);
        });
      });

      describe('status', () => {
        before(async () => {
          await cases.api.createNthRandomCases(2);
          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        after(async () => {
          await cases.api.deleteAllCases();
          await cases.casesTable.waitForCasesToBeDeleted();
        });

        it('change the status of cases to in-progress correctly', async () => {
          await cases.casesTable.selectAndChangeStatusOfAllCases(CaseStatuses['in-progress']);
          await cases.casesTable.waitForTableToFinishLoading();
          await testSubjects.missingOrFail('case-status-badge-open');
        });
      });

      describe('severity', () => {
        before(async () => {
          await cases.api.createNthRandomCases(2);
          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        after(async () => {
          await cases.api.deleteAllCases();
          await cases.casesTable.waitForCasesToBeDeleted();
        });

        it('change the severity of cases to medium correctly', async () => {
          await cases.casesTable.selectAndChangeSeverityOfAllCases(CaseSeverity.MEDIUM);
          await cases.casesTable.waitForTableToFinishLoading();
          await testSubjects.missingOrFail('case-severity-badge-low');
        });
      });

      describe('tags', () => {
        let caseIds: string[] = [];
        beforeEach(async () => {
          caseIds = [];
          const case1 = await cases.api.createCase({ title: 'case 1', tags: ['one', 'three'] });
          const case2 = await cases.api.createCase({ title: 'case 2', tags: ['two', 'four'] });
          const case3 = await cases.api.createCase({ title: 'case 3', tags: ['two', 'five'] });

          caseIds.push(case1.id);
          caseIds.push(case2.id);
          caseIds.push(case3.id);

          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        afterEach(async () => {
          await cases.api.deleteAllCases();
          await cases.casesTable.waitForCasesToBeDeleted();
        });

        it('bulk edit tags', async () => {
          /**
           * Case 3 tags: two, five
           * Case 2 tags: two, four
           * Case 1 tags: one, three
           * All tags: one, two, three, four, five.
           *
           * It selects Case 3 and Case 2 because the table orders
           * the cases in descending order by creation date and clicks
           * the one, three, and five tags
           */
          await cases.casesTable.bulkEditTags([0, 1], ['two', 'three', 'five']);
          await header.waitUntilLoadingHasFinished();
          const case1 = await cases.api.getCase({ caseId: caseIds[0] });
          const case2 = await cases.api.getCase({ caseId: caseIds[1] });
          const case3 = await cases.api.getCase({ caseId: caseIds[2] });

          expect(case3.tags).eql(['five', 'three']);
          expect(case2.tags).eql(['four', 'five', 'three']);
          expect(case1.tags).eql(['one', 'three']);
        });

        it('adds a new tag', async () => {
          await cases.casesTable.bulkAddNewTag([0, 1], 'tw');
          await header.waitUntilLoadingHasFinished();

          const case1 = await cases.api.getCase({ caseId: caseIds[0] });
          const case2 = await cases.api.getCase({ caseId: caseIds[1] });
          const case3 = await cases.api.getCase({ caseId: caseIds[2] });

          expect(case3.tags).eql(['two', 'five', 'tw']);
          expect(case2.tags).eql(['two', 'four', 'tw']);
          expect(case1.tags).eql(['one', 'three']);
        });
      });

      describe('assignees', () => {
        let caseIds: string[] = [];
        let profiles: UserProfile[] = [];

        const findAssigneeByUserName = (username: string) =>
          profiles.find((profile) => profile.user.username === username);

        before(async () => {
          await createUsersAndRoles(getService, users, roles);
          await cases.api.activateUserProfiles(users);

          profiles = await cases.api.suggestUserProfiles({
            name: '',
            owners: ['cases'],
          });
        });

        beforeEach(async () => {
          caseIds = [];
          const casesAll = findAssigneeByUserName('cases_all_user')!;
          const casesAll2 = findAssigneeByUserName('cases_all_user2')!;
          const casesNoDelete = findAssigneeByUserName('cases_no_delete_user')!;

          const case1 = await cases.api.createCase({
            title: 'case 1',
            assignees: [{ uid: casesAll.uid }],
          });

          const case2 = await cases.api.createCase({
            title: 'case 2',
            assignees: [{ uid: casesAll2.uid }, { uid: casesNoDelete.uid }],
          });

          const case3 = await cases.api.createCase({
            title: 'case 3',
            assignees: [{ uid: casesAll2.uid }],
          });

          caseIds.push(case1.id);
          caseIds.push(case2.id);
          caseIds.push(case3.id);

          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        afterEach(async () => {
          await cases.api.deleteAllCases();
          await cases.casesTable.waitForCasesToBeDeleted();
        });

        after(async () => {
          await deleteUsersAndRoles(getService, users, roles);
        });

        it('bulk edit assignees', async () => {
          const casesAll2 = findAssigneeByUserName('cases_all_user2')!;
          const casesNoDelete = findAssigneeByUserName('cases_no_delete_user')!;
          const casesAll = findAssigneeByUserName('cases_all_user')!;

          /**
           * Case 3 assignees: cases_all_user2
           * Case 2 assignees: cases_all_user2, cases_no_delete_user
           * Case 1 assignees: cases_all_user
           * All assignees: cases_all_user, cases_all_user2, cases_read_delete_user, cases_no_delete_user
           *
           * It selects Case 3 and Case 2 because the table orders
           * the cases in descending order by creation date and clicks
           * the cases_all_user2, cases_no_delete_user
           */

          await cases.casesTable.bulkEditAssignees([0, 1], [casesAll2.uid, casesNoDelete.uid]);

          await header.waitUntilLoadingHasFinished();

          const case1 = await cases.api.getCase({ caseId: caseIds[0] });
          const case2 = await cases.api.getCase({ caseId: caseIds[1] });
          const case3 = await cases.api.getCase({ caseId: caseIds[2] });

          expect(case3.assignees.map(({ uid }) => uid)).eql([casesNoDelete.uid]);
          expect(case2.assignees.map(({ uid }) => uid)).eql([casesNoDelete.uid]);
          expect(case1.assignees.map(({ uid }) => uid)).eql([casesAll.uid]);
        });

        it('adds a new assignee', async () => {
          const casesNoDelete = findAssigneeByUserName('cases_no_delete_user')!;
          const casesAll = findAssigneeByUserName('cases_all_user')!;
          const casesAll2 = findAssigneeByUserName('cases_all_user2')!;

          await cases.casesTable.bulkAddNewAssignees([0, 1], 'cases all_user');
          await header.waitUntilLoadingHasFinished();

          const case1 = await cases.api.getCase({ caseId: caseIds[0] });
          const case2 = await cases.api.getCase({ caseId: caseIds[1] });
          const case3 = await cases.api.getCase({ caseId: caseIds[2] });

          expect(case3.assignees.map(({ uid }) => uid)).eql([casesAll2.uid, casesAll.uid]);
          expect(case2.assignees.map(({ uid }) => uid)).eql([
            casesAll2.uid,
            casesNoDelete.uid,
            casesAll.uid,
          ]);
          expect(case1.assignees.map(({ uid }) => uid)).eql([casesAll.uid]);
        });
      });
    });

    describe('pagination', () => {
      before(async () => {
        await cases.api.createNthRandomCases(12);
        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await browser.clearLocalStorage();
        await cases.navigation.navigateToApp();
        await cases.casesTable.waitForCasesToBeDeleted();
      });

      it('paginates cases correctly', async () => {
        await testSubjects.click('tablePaginationPopoverButton');
        await testSubjects.click('tablePagination-25-rows');
        await testSubjects.missingOrFail('pagination-button-1');
        await testSubjects.click('tablePaginationPopoverButton');
        await testSubjects.click('tablePagination-10-rows');
        await testSubjects.isEnabled('pagination-button-1');
        await testSubjects.click('pagination-button-1');
        await testSubjects.isEnabled('pagination-button-0');
      });
    });

    describe('row actions', () => {
      before(async () => {
        await browser.clearLocalStorage();
        await cases.navigation.navigateToApp();
      });

      afterEach(async () => {
        await toasts.dismissAllWithChecks();
      });

      describe('Status', () => {
        before(async () => {
          await cases.api.createNthRandomCases(1);
          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        after(async () => {
          await cases.api.deleteAllCases();
          await cases.casesTable.waitForCasesToBeDeleted();
        });

        it('to in progress', async () => {
          await cases.casesTable.changeStatus(CaseStatuses['in-progress'], 0);
          await testSubjects.existOrFail(`case-status-badge-${CaseStatuses['in-progress']}`);
        });

        it('to closed', async () => {
          await cases.casesTable.changeStatus(CaseStatuses.closed, 0);
          await testSubjects.existOrFail(`case-status-badge-${CaseStatuses.closed}`);
        });

        it('to open', async () => {
          await cases.casesTable.changeStatus(CaseStatuses.open, 0);
          await testSubjects.existOrFail(`case-status-badge-${CaseStatuses.open}`);
        });
      });

      describe('Delete', () => {
        before(async () => {
          await cases.api.createNthRandomCases(1);
          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        after(async () => {
          await cases.api.deleteAllCases();
          await cases.casesTable.waitForCasesToBeDeleted();
        });

        it('deletes a case correctly', async () => {
          await cases.casesTable.deleteCase(0);
          await cases.casesTable.waitForTableToFinishLoading();
          await cases.casesTable.validateCasesTableHasNthRows(0);
        });
      });
    });

    describe('Column Selection', () => {
      afterEach(async () => {
        await toasts.dismissAllWithChecks();
      });

      before(async () => {
        await cases.api.createNthRandomCases(1);
        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await cases.casesTable.waitForCasesToBeDeleted();
        await browser.clearLocalStorage();
      });

      it('column selection popover button exists', async () => {
        await testSubjects.existOrFail('column-selection-popover-button');
      });

      it('selecting a column works correctly', async () => {
        expect(await cases.casesTable.hasColumn('Closed on')).to.be(false);

        await cases.casesTable.toggleColumnInPopover('closedAt');

        expect(await cases.casesTable.hasColumn('Closed on')).to.be(true);
      });

      it('deselecting columns works correctly', async () => {
        expect(await cases.casesTable.hasColumn('Name')).to.be(true);

        await cases.casesTable.toggleColumnInPopover('title');

        expect(await cases.casesTable.hasColumn('Name')).to.be(false);
      });

      it('"Hide All" columns works correctly', async () => {
        await cases.casesTable.openColumnsPopover();

        await testSubjects.click('column-selection-popover-hide-all-button');

        await cases.casesTable.closeColumnsPopover();

        expect(await cases.casesTable.hasColumn('Name')).to.be(false);
        expect(await cases.casesTable.hasColumn('Assignees')).to.be(false);
        expect(await cases.casesTable.hasColumn('Tags')).to.be(false);
        expect(await cases.casesTable.hasColumn('Category')).to.be(false);
      });

      it('"Show All" columns works correctly', async () => {
        await cases.casesTable.openColumnsPopover();

        await testSubjects.click('column-selection-popover-show-all-button');

        await cases.casesTable.closeColumnsPopover();

        expect(await cases.casesTable.hasColumn('Name')).to.be(true);
        expect(await cases.casesTable.hasColumn('Assignees')).to.be(true);
        expect(await cases.casesTable.hasColumn('Tags')).to.be(true);
        expect(await cases.casesTable.hasColumn('Category')).to.be(true);
        expect(await cases.casesTable.hasColumn('Closed on')).to.be(true);
      });

      it('search and toggle column works correctly', async () => {
        await cases.casesTable.openColumnsPopover();

        const input = await testSubjects.find('column-selection-popover-search');
        await input.type('name');

        await testSubjects.existOrFail('column-selection-switch-title');
        await testSubjects.missingOrFail('column-selection-switch-closedAt');
        await testSubjects.missingOrFail('column-selection-switch-category');
      });
    });
  });
};
