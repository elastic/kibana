/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexConnector } from '../../objects/connector';
import { getSimpleRule } from '../../objects/rule';

import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import {
  createDocument,
  createIndex,
  deleteIndex,
  waitForNewDocumentToBeIndexed,
} from '../../tasks/api_calls/elasticsearch';
import {
  cleanKibana,
  deleteAlertsAndRules,
  deleteConnectors,
  deleteDataView,
  postDataView,
} from '../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillDefineCustomRuleAndContinue,
  fillRuleAction,
  fillScheduleRuleAndContinue,
  waitForTheRuleToBeExecuted,
} from '../../tasks/create_new_rule';
import { login, visit } from '../../tasks/login';

import { RULE_CREATION } from '../../urls/navigation';

describe('Rule actions', () => {
  const INDEX_CONNECTOR = getIndexConnector();

  before(() => {
    cleanKibana();
    login();

    /* For later being able to create an index connector, we need to a dataview with at least one document ingested */
    createIndex(INDEX_CONNECTOR.index);
    postDataView(INDEX_CONNECTOR.index);
    createDocument(INDEX_CONNECTOR.index, '{}');
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    deleteConnectors();
  });

  after(() => {
    deleteIndex(INDEX_CONNECTOR.index);
    deleteDataView(INDEX_CONNECTOR.index);
  });

  const rule = {
    ...getSimpleRule(),
    actions: { interval: 'rule', connectors: [INDEX_CONNECTOR] },
  };
  const index = rule.actions.connectors[0].index;
  const initialNumberOfDocuments = 1;
  const expectedJson = JSON.parse(rule.actions.connectors[0].document);

  it('Creates a custom query rule with an index action ', function () {
    visit(RULE_CREATION);
    fillDefineCustomRuleAndContinue(rule);
    fillAboutRuleAndContinue(rule);
    fillScheduleRuleAndContinue(rule);
    fillRuleAction(rule);
    createAndEnableRule();
    goToRuleDetails();
    waitForTheRuleToBeExecuted();

    /* Once the action is triggered we wait for the new document to be indexed */
    waitForNewDocumentToBeIndexed(index, initialNumberOfDocuments);

    /* We assert that the new indexed document is the one set on the index action */
    cy.request({
      method: 'GET',
      url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_search`,
      headers: { 'kbn-xsrf': 'cypress-creds' },
    }).then((response) => {
      expect(response.body.hits.hits[1]._source).to.have.property(
        Object.keys(expectedJson).join(),
        Object.values(expectedJson).join()
      );
    });
  });
});
