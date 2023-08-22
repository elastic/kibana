/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../tags';
import { navigateTo } from '../../tasks/navigation';
import {
  checkResults,
  inputQuery,
  selectAllAgents,
  submitQuery,
  typeInECSFieldInput,
  typeInOsqueryFieldInput,
} from '../../tasks/live_query';
import { LIVE_QUERY_EDITOR } from '../../screens/live_query';
import { getAdvancedButton } from '../../screens/integrations';

describe('ALL - Live Query', { tags: [tag.SERVERLESS, tag.ESS] }, () => {
  beforeEach(() => {
    cy.login('soc_manager');
    navigateTo('/app/osquery');
  });

  it('should validate the form', () => {
    cy.contains('New live query').click();
    submitQuery();
    cy.contains('Agents is a required field');
    cy.contains('Query is a required field');
    selectAllAgents();
    inputQuery('select * from uptime;');
    submitQuery();
    cy.contains('Agents is a required field').should('not.exist');
    cy.contains('Query is a required field').should('not.exist');
    checkResults();
    getAdvancedButton().click();
    typeInOsqueryFieldInput('days{downArrow}{enter}');
    submitQuery();
    cy.contains('ECS field is required.');
    typeInECSFieldInput('message{downArrow}{enter}');
    submitQuery();
    cy.contains('ECS field is required.').should('not.exist');

    checkResults();
    cy.react('Cell', { props: { colIndex: 0 } })
      .should('exist')
      .first()
      .click();
    cy.url().should('include', 'app/fleet/agents/');
  });

  it('should run multiline query', () => {
    const multilineQuery =
      'select u.username, {shift+enter}' +
      '       p.pid, {shift+enter}' +
      '       p.name, {shift+enter}' +
      '       pos.local_address, {shift+enter}' +
      '       pos.local_port, {shift+enter}' +
      '       p.path, {shift+enter}' +
      '       p.cmdline, {shift+enter}' +
      '       pos.remote_address, {shift+enter}' +
      '       pos.remote_port {shift+enter}' +
      'from processes as p{esc}{shift+enter}' +
      'join users as u{esc}{shift+enter}' +
      '    on u.uid=p.uid{esc}{shift+enter}' +
      'join process_open_sockets as pos{esc}{shift+enter}' +
      '    on pos.pid=p.pid{esc}{shift+enter}' +
      "where pos.remote_port !='0' {shift+enter}" +
      'limit 1000;';
    cy.contains('New live query').click();
    cy.get(LIVE_QUERY_EDITOR).invoke('height').and('be.gt', 99).and('be.lt', 110);
    cy.get(LIVE_QUERY_EDITOR).click().invoke('val', multilineQuery);

    inputQuery(multilineQuery);
    cy.get(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 220).and('be.lt', 300);
    selectAllAgents();
    submitQuery();
    cy.getBySel('osqueryResultsPanel');

    // check if it get's bigger when we add more lines
    cy.get(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 220).and('be.lt', 300);
    inputQuery(multilineQuery);
    cy.get(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 350).and('be.lt', 550);

    inputQuery('{selectall}{backspace}{selectall}{backspace}');
    // not sure if this is how it used to work when I implemented the functionality, but let's leave it like this for now
    cy.get(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 200).and('be.lt', 380);
  });
});
