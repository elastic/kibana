/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addLastLiveQueryToCase,
  checkActionItemsInResults,
  viewRecentCaseAndCheckResults,
} from '../../tasks/live_query';
import { navigateTo } from '../../tasks/navigation';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';
import { login } from '../../tasks/login';
import { ROLES } from '../../test';

describe('Add to Cases', () => {
  describe('observability', () => {
    before(() => {
      runKbnArchiverScript(ArchiverMethod.LOAD, 'case_observability');
      login(ROLES.soc_manager);
      navigateTo('/app/osquery');
    });

    after(() => {
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'case_observability');
    });
    it('should add result a case and not have add to timeline in result', () => {
      addLastLiveQueryToCase();
      cy.contains('Test Obs case has been updated');
      viewRecentCaseAndCheckResults();

      cy.contains("SELECT * FROM os_version where name='Ubuntu';");
      checkActionItemsInResults({
        lens: true,
        discover: true,
        cases: false,
        timeline: false,
      });
    });
  });
  describe('security', () => {
    before(() => {
      runKbnArchiverScript(ArchiverMethod.LOAD, 'case_security');
      login(ROLES.soc_manager);
      navigateTo('/app/osquery');
    });

    after(() => {
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'case_security');
    });

    it('should add result a case and have add to timeline in result', () => {
      addLastLiveQueryToCase();
      cy.contains('Test Security Case has been updated');
      viewRecentCaseAndCheckResults();

      cy.contains("SELECT * FROM os_version where name='Ubuntu';");
      checkActionItemsInResults({
        lens: true,
        discover: true,
        cases: false,
        timeline: true,
      });
    });
  });
});
