/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_DETECTIONS_RULES_URL } from '../../../urls/navigation';
import { getDataViewRule } from '../../../objects/rule';
import { createRule } from '../../../tasks/api_calls/rules';
import {
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  INDEX_PATTERNS_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
  DATA_VIEW_DETAILS,
} from '../../../screens/rule_details';

import {
  goToRuleDetails,
  waitForRulesTableToBeLoaded,
} from '../../../tasks/alerts_detection_rules';
import { postDataView } from '../../../tasks/common';

import { login, visitWithoutDateRange } from '../../../tasks/login';
import { getDetails } from '../../../tasks/rule_details';

// Only testing components in the rule details page unique to rules using dataviews
describe('Custom query rule with dataview', () => {
  const rule = getDataViewRule();

  beforeEach(() => {
    /* We don't call cleanKibana method on the before hook, instead we call esArchiverReseKibana on the before each. This is because we
      are creating a data view we'll use after and cleanKibana does not delete all the data views created, esArchiverReseKibana does.
      We don't use esArchiverReseKibana in all the tests because is a time-consuming method and we don't need to perform an exhaustive
      cleaning in all the other tests. */
    cy.task('esArchiverResetKibana');
    if (rule.data_view_id != null) {
      postDataView(rule.data_view_id);
    }
    createRule(rule);
    login();
    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
    waitForRulesTableToBeLoaded();
  });

  it('Displays data view details', function () {
    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);

    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(DATA_VIEW_DETAILS).should('have.text', rule.data_view_id);
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', rule.query);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
    });
    cy.get(DEFINITION_DETAILS).should('not.contain', INDEX_PATTERNS_DETAILS);
  });
});
