/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../tags';
import { navigateTo } from '../../tasks/navigation';
import {
  checkActionItemsInResults,
  checkResults,
  inputQuery,
  selectAllAgents,
  submitQuery,
  typeInECSFieldInput,
  typeInOsqueryFieldInput,
} from '../../tasks/live_query';
import {
  LIVE_QUERY_EDITOR,
  RESULTS_TABLE,
  RESULTS_TABLE_BUTTON,
  RESULTS_TABLE_CELL_WRRAPER,
} from '../../screens/live_query';
import { getAdvancedButton } from '../../screens/integrations';
import { loadSavedQuery, cleanupSavedQuery } from '../../tasks/api_fixtures';
import { ServerlessRoleName } from '../../../../../test_serverless/shared/lib';

describe('ALL - Live Query run custom and saved', { tags: [tag.ESS] }, () => {
  let savedQueryId: string;
  let savedQueryName: string;

  before(() => {
    loadSavedQuery({
      interval: '3600',
      query: 'select * from uptime;',
      ecs_mapping: {},
    }).then((savedQuery) => {
      savedQueryId = savedQuery.saved_object_id;
      savedQueryName = savedQuery.name;
    });
  });

  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
    navigateTo('/app/osquery');
  });

  after(() => {
    cleanupSavedQuery(savedQueryId);
  });

  it('should run query and enable ecs mapping', () => {
    const cmd = Cypress.platform === 'darwin' ? '{meta}{enter}' : '{ctrl}{enter}';
    cy.contains('New live query').click();
    selectAllAgents();
    inputQuery('select * from uptime;');
    cy.wait(500);
    // checking submit by clicking cmd+enter
    inputQuery(cmd);
    checkResults();
    checkActionItemsInResults({
      lens: true,
      discover: true,
      cases: true,
      timeline: false,
    });
    cy.react(RESULTS_TABLE_CELL_WRRAPER, {
      props: { id: 'osquery.days.number', index: 1 },
    }).should('exist');
    cy.react(RESULTS_TABLE_CELL_WRRAPER, {
      props: { id: 'osquery.hours.number', index: 2 },
    }).should('exist');

    getAdvancedButton().click();
    typeInECSFieldInput('message{downArrow}{enter}');
    typeInOsqueryFieldInput('days{downArrow}{enter}');
    submitQuery();

    checkResults();
    cy.getBySel(RESULTS_TABLE).within(() => {
      cy.getBySel(RESULTS_TABLE_BUTTON).should('exist');
    });
    cy.react(RESULTS_TABLE_CELL_WRRAPER, {
      props: { id: 'message', index: 1 },
    }).should('exist');
    cy.react(RESULTS_TABLE_CELL_WRRAPER, {
      props: { id: 'osquery.days.number', index: 2 },
    })
      .react('EuiIconTip', { props: { type: 'indexMapping' } })
      .should('exist');
  });

  it('should run customized saved query', () => {
    cy.contains('New live query').click();
    selectAllAgents();
    cy.react('SavedQueriesDropdown').type(`${savedQueryName}{downArrow}{enter}`);
    inputQuery('{selectall}{backspace}select * from users;');
    cy.wait(1000);
    submitQuery();
    checkResults();
    navigateTo('/app/osquery');
    cy.react('EuiButtonIcon', { props: { iconType: 'play' } })
      .eq(0)
      .should('be.visible')
      .click();

    cy.get(LIVE_QUERY_EDITOR).contains('select * from users;');
  });

  it('should open query details by clicking the details icon', () => {
    cy.react('EuiButtonIcon', { props: { iconType: 'visTable' } })
      .first()
      .click();
    cy.contains('Live query details');
    cy.contains('select * from users;');
  });
});
