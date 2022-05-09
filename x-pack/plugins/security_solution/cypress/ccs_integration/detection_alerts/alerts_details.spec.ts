/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JSON_TEXT } from '../../screens/alerts_details';

import { expandFirstAlert, waitForAlertsPanelToBeLoaded } from '../../tasks/alerts';
import { openJsonView } from '../../tasks/alerts_details';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { esArchiverCCSLoad } from '../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../tasks/login';

import { getUnmappedCCSRule } from '../../objects/rule';

import { ALERTS_URL } from '../../urls/navigation';

describe('Alert details with unmapped fields', () => {
  beforeEach(() => {
    login();
    cleanKibana();
    esArchiverCCSLoad('unmapped_fields');
    createCustomRuleEnabled(getUnmappedCCSRule());
    visitWithoutDateRange(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
    expandFirstAlert();
  });

  it('Displays the unmapped field on the JSON view', () => {
    const expectedUnmappedValue = 'This is the unmapped field';

    openJsonView();

    cy.get(JSON_TEXT).then((x) => {
      const parsed = JSON.parse(x.text());
      expect(parsed._source.unmapped).to.equal(expectedUnmappedValue);
    });
  });
});
