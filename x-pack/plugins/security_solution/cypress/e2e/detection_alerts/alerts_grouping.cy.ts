/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGroupLevel, openGroup, selectGroup } from '../../tasks/alerts_grouping';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import {
  expectRowsPerPage,
  expectTablePageActive,
  goToTablePage,
  setWithinRowsPerPageTo,
} from '../../tasks/table_pagination';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { GROUP_LEVEL_SELECTOR, GROUP_LOADER } from '../../screens/alerts';

import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';

import { ALERTS_URL } from '../../urls/navigation';
describe('Alerts grouping', { testIsolation: false }, () => {
  // for (let i = 0; i < 100; i++) {
  describe('Filter', () => {
    before(() => {
      cleanKibana();
      esArchiverLoad('grouping_default');
      login();
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });
    after(() => {
      esArchiverUnload('grouping_default');
    });
    // afterEach(() => {
    //   cy.reload();
    //   scrollGroupsIntoView();
    // });

    it('should reset all pagination levels when selected group changes', () => {
      selectGroup('kibana.alert.rule.name');
      getGroupLevel(0, () => {
        expectRowsPerPage(25);
      });
      setWithinRowsPerPageTo(GROUP_LEVEL_SELECTOR(0), 10);
      getGroupLevel(0, () => {
        expectRowsPerPage(10);
      });
      selectGroup('host.name');
      getGroupLevel(0, () => {
        expectTablePageActive(1);
        goToTablePage(2);
        expectTablePageActive(2);
      });
      openGroup('first');
      getGroupLevel(1, () => {
        expectRowsPerPage(25);
      });
      setWithinRowsPerPageTo(GROUP_LEVEL_SELECTOR(1), 10);
      getGroupLevel(1, () => {
        expectRowsPerPage(10);
      });
      getGroupLevel(1, () => {
        expectTablePageActive(1);
        goToTablePage(2);
        expectTablePageActive(2);
      });
      selectGroup('user.name');
      getGroupLevel(0, () => {
        expectTablePageActive(1);
      });
      getGroupLevel(1, () => {
        expectTablePageActive(1);
      });
    });

    it.skip('should reset inner pagination only when a new group opens', () => {
      // set level 0 page to 2
      getGroupLevel(0, () => {
        goToTablePage(2);
      });
      // open level 1 group
      openGroup('first');
      // set level 1 page to 2
      getGroupLevel(1, () => {
        cy.get(GROUP_LOADER).should('not.exist');
        goToTablePage(2);
      });
      // open different level 1 group
      openGroup('last');
      // level 1 page should be 1
      getGroupLevel(1, () => {
        expectTablePageActive(1);
      });
      // level 0 page should be 2
      getGroupLevel(0, () => {
        cy.get(GROUP_LOADER).should('not.exist');
        expectTablePageActive(2);
      });
    });
  });
  // }
});
