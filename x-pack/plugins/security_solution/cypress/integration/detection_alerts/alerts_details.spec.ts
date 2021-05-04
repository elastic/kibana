/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JSON_LINES } from '../../screens/alerts_details';

import {
  expandFirstAlert,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../../tasks/alerts';
import { openJsonView, scrollJsonViewToBottom } from '../../tasks/alerts_details';
import { createCustomRuleActivated } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { esArchiverLoad } from '../../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { unmappedRule } from '../../objects/rule';

import { DETECTIONS_URL } from '../../urls/navigation';

describe('Alert details with unmapped fields', () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('unmapped_fields');
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRuleActivated(unmappedRule);
  });
  beforeEach(() => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    expandFirstAlert();
  });
  it('Displays the unmapped field on the JSON view', () => {
    const expectedUnmappedField = { line: 2, text: '  "unmapped": "This is the unmapped field"' };

    openJsonView();
    scrollJsonViewToBottom();

    cy.get(JSON_LINES).then((elements) => {
      const length = elements.length;
      cy.wrap(elements)
        .eq(length - expectedUnmappedField.line)
        .should('have.text', expectedUnmappedField.text);
    });
  });
});
