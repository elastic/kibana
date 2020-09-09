/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CustomRule } from '../objects/rule';
import {
  RULE_NAME_HEADER,
  ABOUT_RULE_DESCRIPTION,
  ABOUT_STEP,
  ABOUT_SEVERITY,
  ABOUT_RISK,
  RULE_ABOUT_DETAILS_HEADER_TOGGLE,
  INVESTIGATION_NOTES_TOGGLE,
  ABOUT_INVESTIGATION_NOTES,
  INVESTIGATION_NOTES_MARKDOWN,
  DEFINITION_INDEX_PATTERNS,
  DEFINITION_STEP,
  DEFINITION_CUSTOM_QUERY,
  DEFINITION_TIMELINE,
  SCHEDULE_STEP,
  SCHEDULE_RUNS,
  SCHEDULE_LOOPBACK,
} from '../screens/rule_details';
import { EDIT_SUBMIT_BUTTON } from '../screens/edit_rule';

export const expectRuleDetails = (rule: CustomRule) => {
  const expectedTags = rule.tags.join('');
  const expectedIndexPatterns =
    rule.index && rule.index.length
      ? rule.index
      : [
          'apm-*-transaction*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'packetbeat-*',
          'winlogbeat-*',
        ];

  cy.get(RULE_NAME_HEADER).invoke('text').should('eql', `${rule.name} Beta`);

  cy.get(ABOUT_RULE_DESCRIPTION).invoke('text').should('eql', rule.description);
  cy.get(ABOUT_STEP).eq(ABOUT_SEVERITY).invoke('text').should('eql', rule.severity);
  cy.get(ABOUT_STEP).eq(ABOUT_RISK).invoke('text').should('eql', rule.riskScore);
  cy.get(ABOUT_STEP).eq(2).invoke('text').should('eql', expectedTags);

  cy.get(RULE_ABOUT_DETAILS_HEADER_TOGGLE).eq(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
  cy.get(ABOUT_INVESTIGATION_NOTES).invoke('text').should('eql', rule.note);

  cy.get(DEFINITION_INDEX_PATTERNS).then((patterns) => {
    cy.wrap(patterns).each((pattern, index) => {
      cy.wrap(pattern).invoke('text').should('eql', expectedIndexPatterns[index]);
    });
  });
  cy.get(DEFINITION_STEP)
    .eq(DEFINITION_CUSTOM_QUERY)
    .invoke('text')
    .should('eql', `${rule.customQuery} `);
  cy.get(DEFINITION_STEP).eq(2).invoke('text').should('eql', 'Query');
  cy.get(DEFINITION_STEP).eq(DEFINITION_TIMELINE).invoke('text').should('eql', 'None');

  if (rule.interval) {
    cy.get(SCHEDULE_STEP).eq(SCHEDULE_RUNS).invoke('text').should('eql', rule.interval);
  }
};

export const saveEditedRule = () => {
  cy.get(EDIT_SUBMIT_BUTTON).should('exist').click({ force: true });
  cy.get(EDIT_SUBMIT_BUTTON).should('not.exist');
};
