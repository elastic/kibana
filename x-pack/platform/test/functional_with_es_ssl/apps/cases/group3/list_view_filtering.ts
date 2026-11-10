/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import rison from '@kbn/rison';
import {
  CaseSeverity,
  CaseStatuses,
  CustomFieldTypes,
} from '@kbn/cases-plugin/common/types/domain';
import type { UserProfile } from '@kbn/core-user-profile-common';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '../../../../cases_api_integration/common/lib/authentication';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { users, roles, casesAllUser, casesAllUser2 } from '../common';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const browser = getService('browser');

  describe('cases list', () => {
    before(async () => {
      await cases.api.deleteAllCases();
      await cases.navigation.navigateToApp();
    });

    after(async () => {
      await cases.api.deleteAllCases();
      await cases.casesTable.waitForCasesToBeDeleted();
    });

    describe('filtering', () => {
      const caseTitle = 'matchme';
      let caseIds: string[] = [];
      const profiles: UserProfile[] = [];
      const customFields = [
        {
          key: 'my_field_01',
          label: 'My field',
          type: CustomFieldTypes.TOGGLE,
          required: false,
        },
      ];

      const createCases = async () => {
        caseIds = [];

        const case1 = await cases.api.createCase({
          title: caseTitle,
          tags: ['one'],
          category: 'foobar',
          description: 'lots of information about an incident',
        });
        // The default description embeds a random UUID, which ID searches can match.
        const case2 = await cases.api.createCase({
          title: 'test2',
          tags: ['two'],
          description: 'second description',
        });
        const case3 = await cases.api.createCase({
          title: case2.id,
          assignees: [{ uid: profiles[0].uid }],
          description: 'third description',
        });
        const case4 = await cases.api.createCase({
          title: 'test4',
          assignees: [{ uid: profiles[1].uid }],
          description: case2.id,
        });

        caseIds.push(case1.id);
        caseIds.push(case2.id);
        caseIds.push(case3.id);
        caseIds.push(case4.id);
      };

      const expectStateToContain = (
        state: Record<string, unknown>,
        expected: Record<string, unknown>
      ) => {
        for (const [key, value] of Object.entries(expected)) {
          expect(state[key]).to.eql(value);
        }
      };

      const getCasesStateFromUrl = async () => {
        const currentUrl = new URL(decodeURIComponent(await browser.getCurrentUrl()));
        const casesParam = currentUrl.searchParams.get('cases') ?? '';

        expect(casesParam).not.to.be('');

        return rison.decode(casesParam) as Record<string, unknown>;
      };

      before(async () => {
        await cases.api.deleteAllCases();
        await createUsersAndRoles(getService, users, roles);
        await cases.api.activateUserProfiles([casesAllUser, casesAllUser2]);

        profiles.push(...(await cases.api.suggestUserProfiles({ name: 'all', owners: ['cases'] })));

        await header.waitUntilLoadingHasFinished();
      });

      beforeEach(async () => {
        await browser.clearLocalStorage();
        await cases.api.createConfigWithCustomFields({ customFields, owner: 'cases' });
        await createCases();
        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });

      const resetListState = async () => {
        await browser.clearLocalStorage();
        await cases.navigation.navigateToApp();
        await cases.casesTable.validateCasesTableHasNthRows(0);
      };

      afterEach(async () => {
        await cases.api.deleteAllCases();
        await resetListState();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await resetListState();
        await deleteUsersAndRoles(getService, users, roles);
      });

      it('filters cases from the list using a full string match', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        // search
        const input = await testSubjects.find('search-cases');
        await input.type(caseTitle);
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(1);
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('filters cases from the list using an id search', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        const input = await testSubjects.find('search-cases');
        await input.type(caseIds[0]);
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.waitForCaseToBeListed(caseIds[0]);
        const searchedCaseTitle = await (
          await cases.casesTable.getCaseById(caseIds[0])
        ).findByTestSubject('case-details-link');
        expect(await searchedCaseTitle.getVisibleText()).to.be(caseTitle);
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('id search also matches title and description', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        const input = await testSubjects.find('search-cases');
        await input.type(caseIds[1]);
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(3);
        await cases.casesTable.getCaseById(caseIds[1]); // id match
        await cases.casesTable.getCaseById(caseIds[2]); // title match
        await cases.casesTable.getCaseById(caseIds[3]); // description match
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('only shows cases with a wildcard query "test*" matching the title', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        const input = await testSubjects.find('search-cases');
        await input.type('test*');
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(2);
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('does not search the owner field', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        const input = await testSubjects.find('search-cases');
        await input.type('cases');
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(0);
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('only shows cases by matching the word "information" from the cases description', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        const input = await testSubjects.find('search-cases');
        await input.type('information');
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(1);
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('only shows cases with a wildcard query "informa*" matching the cases description', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        const input = await testSubjects.find('search-cases');
        await input.type('informa*');
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(1);
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('filters cases by tags', async () => {
        await cases.casesTable.filterByTag('one');
        await cases.casesTable.refreshTable();
        await cases.casesTable.validateCasesTableHasNthRows(1);
        const row = await cases.casesTable.getCaseByIndex(0);
        const tags = await row.findByTestSubject('case-table-column-tags-one');
        expect(await tags.getVisibleText()).to.be('one');
      });

      it('filters cases by category', async () => {
        await cases.casesTable.filterByCategory('foobar');
        await cases.casesTable.refreshTable();
        await cases.casesTable.validateCasesTableHasNthRows(1);
        const row = await cases.casesTable.getCaseByIndex(0);
        const category = await row.findByTestSubject('case-table-column-category-foobar');
        expect(await category.getVisibleText()).to.be('foobar');
      });

      it('filters cases by status', async () => {
        await cases.casesTable.changeStatus(CaseStatuses['in-progress'], 0);
        await testSubjects.existOrFail(`case-status-badge-${CaseStatuses['in-progress']}`);
        await cases.casesTable.filterByStatus(CaseStatuses['in-progress']);
        await cases.casesTable.validateCasesTableHasNthRows(1);
      });

      it('filter multiple status', async () => {
        await cases.casesTable.changeStatus(CaseStatuses['in-progress'], 0);
        await cases.casesTable.refreshTable();
        await cases.casesTable.changeStatus(CaseStatuses.closed, 1);
        await cases.casesTable.refreshTable();

        // by default filter by all
        await cases.casesTable.validateCasesTableHasNthRows(4);

        await cases.casesTable.filterByStatus(CaseStatuses.open);
        await cases.casesTable.validateCasesTableHasNthRows(2);

        await cases.casesTable.filterByStatus(CaseStatuses['in-progress']);
        await cases.casesTable.validateCasesTableHasNthRows(3);

        await cases.casesTable.filterByStatus(CaseStatuses.closed);
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('persists status filters', async () => {
        await cases.casesTable.changeStatus(CaseStatuses.closed, 0);
        await testSubjects.existOrFail(`case-status-badge-${CaseStatuses.closed}`);
        await browser.refresh();
        await testSubjects.existOrFail(`case-status-badge-${CaseStatuses.closed}`);
      });

      it('persists multiple status filters', async () => {
        await cases.casesTable.changeStatus(CaseStatuses['in-progress'], 0);
        await cases.casesTable.changeStatus(CaseStatuses.closed, 1);
        await cases.casesTable.filterByStatus(CaseStatuses['in-progress']);
        await cases.casesTable.filterByStatus(CaseStatuses.closed);
        await cases.casesTable.validateCasesTableHasNthRows(2);
        await browser.refresh();
        await testSubjects.existOrFail(`case-status-badge-${CaseStatuses['in-progress']}`);
        await testSubjects.existOrFail(`case-status-badge-${CaseStatuses.closed}`);
        await cases.casesTable.validateCasesTableHasNthRows(2);
      });

      it('persists severity filters', async () => {
        await cases.casesTable.changeSeverity(CaseSeverity.MEDIUM, 0);
        await testSubjects.existOrFail(`case-severity-badge-${CaseSeverity.MEDIUM}`);
        await browser.refresh();
        await testSubjects.existOrFail(`case-severity-badge-${CaseSeverity.MEDIUM}`);
      });

      it('persists multiple severity filters', async () => {
        await cases.casesTable.changeSeverity(CaseSeverity.HIGH, 0);
        await cases.casesTable.changeSeverity(CaseSeverity.MEDIUM, 1);
        await cases.casesTable.filterBySeverity(CaseSeverity.HIGH);
        await cases.casesTable.filterBySeverity(CaseSeverity.MEDIUM);
        await cases.casesTable.validateCasesTableHasNthRows(2);
        await browser.refresh();
        await testSubjects.existOrFail(`case-severity-badge-${CaseSeverity.HIGH}`);
        await testSubjects.existOrFail(`case-severity-badge-${CaseSeverity.MEDIUM}`);
        await cases.casesTable.validateCasesTableHasNthRows(2);
      });

      it('clears the filters correctly', async () => {
        // filter by status first
        await cases.casesTable.filterByTag('one');
        await cases.casesTable.validateCasesTableHasNthRows(1);

        await cases.casesTable.clearFilters();
        await cases.casesTable.validateCasesTableHasNthRows(caseIds.length);
      });

      it('loads the state from the local storage when the URL is empty', async () => {
        await cases.casesTable.validateCasesTableHasNthRows(caseIds.length);
        const lsState = {
          filterOptions: {
            search: '',
            searchFields: ['title', 'description', 'incremental_id.text'],
            severity: [],
            assignees: [],
            reporters: [],
            status: [],
            // filter by tags
            tags: ['one'],
            owner: [],
            category: [],
            customFields: {},
          },
          queryParams: { page: 1, perPage: 10, sortField: 'createdAt', sortOrder: 'desc' },
        };

        await cases.casesTable.setAllCasesStateInLocalStorage(lsState);

        /**
         * Clicking to the navigation bar (sidebar) clears out any query params
         * added by the cases app.
         */
        await testSubjects.click('cases');
        await cases.casesTable.validateCasesTableHasNthRows(1);
        await cases.casesTable.verifyCase(caseIds[0], 0);
      });

      it('loads the state from the URL with empty filter configuration in local storage', async () => {
        const theCase = await cases.api.createCase({
          title: 'url-testing',
          assignees: [{ uid: profiles[0].uid }],
          description: 'url testing',
          category: 'url-testing',
          tags: ['url'],
          severity: CaseSeverity.CRITICAL,
          customFields: [{ key: customFields[0].key, type: CustomFieldTypes.TOGGLE, value: true }],
        });

        const lsState = [
          { key: 'status', isActive: false },
          { key: 'severity', isActive: false },
          { key: 'tags', isActive: false },
          { key: 'assignees', isActive: false },
          { key: 'category', isActive: false },
        ];

        await cases.casesTable.setFiltersConfigurationInLocalStorage(lsState);
        await cases.casesTable.waitForNthToBeListed(caseIds.length + 1);

        const casesState = {
          search: theCase.title,
          severity: [theCase.severity],
          status: [theCase.status],
          tags: theCase.tags,
          assignees: [profiles[0].uid],
          category: [theCase.category],
        };

        await cases.casesTable.setStateToUrlAndNavigate(casesState);
        await cases.casesTable.validateCasesTableHasNthRows(1);
        await cases.casesTable.verifyCase(theCase.id, 0);

        expectStateToContain(await getCasesStateFromUrl(), casesState);

        await cases.casesTable.expectFiltersToBeActive([
          'status',
          'severity',
          'tags',
          'category',
          'assignees',
        ]);

        const searchBar = await testSubjects.find('search-cases');
        expect(await searchBar.getAttribute('value')).to.be(casesState.search);
      });

      it('loads the state from the URL with filter configuration in local storage', async () => {
        const theCase = await cases.api.createCase({
          title: 'url-testing',
          assignees: [{ uid: profiles[0].uid }],
          description: 'url testing',
          category: 'url-testing',
          tags: ['url'],
          severity: CaseSeverity.CRITICAL,
          customFields: [{ key: customFields[0].key, type: CustomFieldTypes.TOGGLE, value: true }],
        });

        await cases.casesTable.waitForNthToBeListed(caseIds.length + 1);

        const casesState = {
          search: theCase.title,
          severity: [theCase.severity],
          status: [theCase.status],
          tags: theCase.tags,
          assignees: [profiles[0].uid],
          category: [theCase.category],
        };

        await cases.casesTable.setStateToUrlAndNavigate(casesState);
        await cases.casesTable.validateCasesTableHasNthRows(1);
        await cases.casesTable.verifyCase(theCase.id, 0);

        expectStateToContain(await getCasesStateFromUrl(), casesState);

        await cases.casesTable.expectFiltersToBeActive([
          'status',
          'severity',
          'tags',
          'category',
          'assignees',
        ]);

        const searchBar = await testSubjects.find('search-cases');
        expect(await searchBar.getAttribute('value')).to.be(casesState.search);
      });

      it('updates the local storage correctly when navigating to a URL', async () => {
        const theCase = await cases.api.createCase({
          title: 'url-testing',
          assignees: [{ uid: profiles[0].uid }],
          description: 'url testing',
          category: 'url-testing',
          tags: ['url'],
          severity: CaseSeverity.CRITICAL,
          customFields: [{ key: customFields[0].key, type: CustomFieldTypes.TOGGLE, value: true }],
        });

        await cases.casesTable.waitForNthToBeListed(caseIds.length + 1);

        const casesState = {
          search: theCase.title,
          severity: [theCase.severity],
          status: [theCase.status],
          tags: theCase.tags,
          assignees: [profiles[0].uid],
          category: [theCase.category],
        };

        await cases.casesTable.setStateToUrlAndNavigate(casesState);
        await cases.casesTable.validateCasesTableHasNthRows(1);
        await cases.casesTable.verifyCase(theCase.id, 0);

        const currentState = await cases.casesTable.getAllCasesStateInLocalStorage();

        expect(currentState.queryParams).to.eql({
          page: 1,
          perPage: 10,
          sortField: 'createdAt',
          sortOrder: 'desc',
        });

        expectStateToContain(currentState.filterOptions, casesState);
      });

      it('loads the state from a legacy URL', async () => {
        const theCase = await cases.api.createCase({
          title: 'url-testing',
          description: 'url testing',
          severity: CaseSeverity.CRITICAL,
        });

        await cases.casesTable.waitForNthToBeListed(caseIds.length + 1);

        const search = `severity=${theCase.severity}&status=${theCase.status}&page=1&perPage=1sortField=createdAt&sortOrder=desc`;

        await cases.navigation.navigateToApp('cases', 'cases-app', search);
        await cases.casesTable.validateCasesTableHasNthRows(1);
        await cases.casesTable.verifyCase(theCase.id, 0);

        const currentUrl = decodeURIComponent(await browser.getCurrentUrl());
        expect(new URL(currentUrl).search).to.be(`?${search}`);

        await cases.casesTable.expectFiltersToBeActive([
          'status',
          'severity',
          'tags',
          'category',
          'assignees',
        ]);
      });

      it('navigating between pages keeps the state', async () => {
        await cases.casesTable.filterByTag('one');
        await cases.casesTable.validateCasesTableHasNthRows(1);
        await cases.casesTable.verifyCase(caseIds[0], 0);
        await cases.casesTable.goToFirstListedCase();

        await header.waitUntilLoadingHasFinished();
        await testSubjects.click('breadcrumb');

        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
        await cases.casesTable.validateCasesTableHasNthRows(1);
        await cases.casesTable.verifyCase(caseIds[0], 0);
      });

      it('loads the initial state correctly', async () => {
        await cases.casesTable.validateCasesTableHasNthRows(caseIds.length);
        expect(await testSubjects.exists('all-cases-clear-filters-link-icon')).to.be(false);
      });

      describe('assignees filtering', () => {
        it('filters cases by the first cases all user assignee', async () => {
          await cases.casesTable.filterByAssignee('all');
          await cases.casesTable.validateCasesTableHasNthRows(1);
          await testSubjects.exists('case-user-profile-avatar-cases_all_user');
        });

        it('filters cases by the casesAllUser2 assignee', async () => {
          await cases.casesTable.filterByAssignee('2');
          await cases.casesTable.validateCasesTableHasNthRows(1);
          await testSubjects.exists('case-user-profile-avatar-cases_all_user2');
        });

        it('filters cases without assignees', async () => {
          await cases.casesTable.openAssigneesPopover();
          await cases.common.selectFirstRowInAssigneesPopover();
          await cases.casesTable.validateCasesTableHasNthRows(2);

          const firstCaseTitle = await (
            await cases.casesTable.getCaseByIndex(0)
          ).findByTestSubject('case-details-link');

          const secondCaseTitle = await (
            await cases.casesTable.getCaseByIndex(1)
          ).findByTestSubject('case-details-link');

          expect(await firstCaseTitle.getVisibleText()).be('test2');
          expect(await secondCaseTitle.getVisibleText()).be('matchme');
        });

        it('filters cases with and without assignees', async () => {
          await cases.casesTable.openAssigneesPopover();
          await cases.common.selectRowsInAssigneesPopover([0, 2]);
          await cases.casesTable.validateCasesTableHasNthRows(3);

          expect(await cases.casesTable.getCaseTitle(0)).be('test4');
          expect(await cases.casesTable.getCaseTitle(1)).be('test2');
          expect(await cases.casesTable.getCaseTitle(2)).be('matchme');
        });
      });
    });

    describe('severity filtering', () => {
      before(async () => {
        await cases.navigation.navigateToApp();
        await cases.api.createCase({ severity: CaseSeverity.LOW });
        await cases.api.createCase({ severity: CaseSeverity.LOW });
        await cases.api.createCase({ severity: CaseSeverity.HIGH });
        await cases.api.createCase({ severity: CaseSeverity.HIGH });
        await cases.api.createCase({ severity: CaseSeverity.CRITICAL });
        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });

      afterEach(async () => {
        await cases.casesTable.clearFilters();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await cases.casesTable.waitForCasesToBeDeleted();
      });

      it('filters cases by severity', async () => {
        // by default filter by all
        await cases.casesTable.validateCasesTableHasNthRows(5);

        await cases.casesTable.filterBySeverity(CaseSeverity.LOW);
        await cases.casesTable.validateCasesTableHasNthRows(2);
        // to uncheck
        await cases.casesTable.filterBySeverity(CaseSeverity.LOW);

        await cases.casesTable.filterBySeverity(CaseSeverity.HIGH);
        await cases.casesTable.validateCasesTableHasNthRows(2);
        // to uncheck
        await cases.casesTable.filterBySeverity(CaseSeverity.HIGH);

        await cases.casesTable.filterBySeverity(CaseSeverity.CRITICAL);
        await cases.casesTable.validateCasesTableHasNthRows(1);
        // to uncheck
        await cases.casesTable.filterBySeverity(CaseSeverity.CRITICAL);

        await cases.casesTable.validateCasesTableHasNthRows(5);
      });

      it('filter multiple severities', async () => {
        // by default filter by all
        await cases.casesTable.validateCasesTableHasNthRows(5);

        await cases.casesTable.filterBySeverity(CaseSeverity.LOW);
        await cases.casesTable.validateCasesTableHasNthRows(2);

        await cases.casesTable.filterBySeverity(CaseSeverity.HIGH);
        await cases.casesTable.validateCasesTableHasNthRows(4);

        await cases.casesTable.filterBySeverity(CaseSeverity.CRITICAL);
        await cases.casesTable.validateCasesTableHasNthRows(5);

        // to uncheck
        await cases.casesTable.filterBySeverity(CaseSeverity.LOW);
        await cases.casesTable.filterBySeverity(CaseSeverity.HIGH);
        await cases.casesTable.filterBySeverity(CaseSeverity.CRITICAL);
      });
    });
  });
};
