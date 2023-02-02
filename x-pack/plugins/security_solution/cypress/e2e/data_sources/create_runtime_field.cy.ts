/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, visit } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { openTimelineFieldsBrowser, populateTimeline } from '../../tasks/timeline';

import { HOSTS_URL, ALERTS_URL } from '../../urls/navigation';

import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';

import { getNewRule } from '../../objects/rule';
import { refreshPage } from '../../tasks/security_header';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { assertFieldDisplayed, createField } from '../../tasks/create_runtime_field';
import { openAlertsFieldBrowser } from '../../tasks/alerts';
import { deleteAlertsIndex } from '../../tasks/sourcerer';

describe('Create DataView runtime field', () => {
  before(() => {
    deleteAlertsIndex();
    login();
  });

  it('adds field to alert table', () => {
    const fieldName = 'field.name.alert.page';
    visit(ALERTS_URL);
    createCustomRuleEnabled(getNewRule());
    refreshPage();
    waitForAlertsToPopulate();
    openAlertsFieldBrowser();

    createField(fieldName);
    assertFieldDisplayed(fieldName, 'alerts');
  });

  it('adds field to timeline', () => {
    const fieldName = 'field.name.timeline';
    visit(HOSTS_URL);
    openTimelineUsingToggle();
    populateTimeline();
    openTimelineFieldsBrowser();

    createField(fieldName);
    assertFieldDisplayed(fieldName);
  });
});
