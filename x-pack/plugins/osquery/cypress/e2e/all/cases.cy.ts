/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addLiveQueryToCase,
  checkActionItemsInResults,
  viewRecentCaseAndCheckResults,
} from '../../tasks/live_query';
import { navigateTo } from '../../tasks/navigation';
import { ROLE, login } from '../../tasks/login';
import { loadLiveQuery, loadCase, cleanupCase } from '../../tasks/api_fixtures';

describe('Add to Cases', () => {
  let liveQueryId: string;
  let liveQueryQuery: string;

  before(() => {
    loadLiveQuery({
      agent_all: true,
      query: "SELECT * FROM os_version where name='Ubuntu';",
    }).then((liveQuery) => {
      liveQueryId = liveQuery.action_id;
      liveQueryQuery = liveQuery.queries[0].query;
    });
  });

  describe('observability', () => {
    let caseId: string;
    let caseTitle: string;

    before(() => {
      loadCase('observability').then((caseInfo) => {
        caseId = caseInfo.id;
        caseTitle = caseInfo.title;
      });
      login(ROLE.soc_manager);
      navigateTo('/app/osquery');
    });

    after(() => {
      cleanupCase(caseId);
    });

    it('should add result a case and not have add to timeline in result', () => {
      addLiveQueryToCase(liveQueryId, caseId);
      cy.contains(`${caseTitle} has been updated`);
      viewRecentCaseAndCheckResults();

      cy.contains(liveQueryQuery);
      checkActionItemsInResults({
        lens: true,
        discover: true,
        cases: false,
        timeline: false,
      });
    });
  });

  describe('security', () => {
    let caseId: string;
    let caseTitle: string;

    before(() => {
      loadCase('securitySolution').then((caseInfo) => {
        caseId = caseInfo.id;
        caseTitle = caseInfo.title;
      });
      login(ROLE.soc_manager);
      navigateTo('/app/osquery');
    });

    after(() => {
      cleanupCase(caseId);
    });

    it('should add result a case and have add to timeline in result', () => {
      addLiveQueryToCase(liveQueryId, caseId);
      cy.contains(`${caseTitle} has been updated`);
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
