/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectRowsPerPage, goToTablePage, setRowsPerPageTo } from '../../tasks/table_pagination';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { GROUP_OPTION_SELECTOR, GROUP_SELECTOR } from '../../screens/alerts';
import { ALERT_TABLE_ACTIONS_HEADER } from '../../screens/timeline';

import { scrollAlertTableColumnIntoView } from '../../tasks/alerts';
import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { removeKqlFilter } from '../../tasks/search_bar';

import { ALERTS_URL } from '../../urls/navigation';
describe('Alerts grouping', { testIsolation: false }, () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('auditbeat_bigger');
    login();
    // importRule('grouping_rules.ndjson');
    visit(ALERTS_URL);
    // waitForAlertsToPopulate();
  });
  after(() => {
    esArchiverUnload('auditbeat_bigger');
  });

  describe('Filter', () => {
    afterEach(() => {
      removeKqlFilter();
      scrollAlertTableColumnIntoView(ALERT_TABLE_ACTIONS_HEADER);
    });

    it('should group by one level', () => {
      cy.get(GROUP_SELECTOR).click();
      cy.get(GROUP_OPTION_SELECTOR('kibana.alert.rule.name')).click();

      expectRowsPerPage(25);
      setRowsPerPageTo(10);
      expectRowsPerPage(10);
      goToTablePage(2);
      cy.wait(100000);
    });
  });
});
