/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { openTimelineFieldsBrowser, populateTimeline } from '../../tasks/timeline';

import { HOSTS_URL, ALERTS_URL } from '../../urls/navigation';

import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';

import { getNewRule } from '../../objects/rule';
import { refreshPage } from '../../tasks/security_header';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { openEventsViewerFieldsBrowser } from '../../tasks/hosts/events';
import { assertFieldDisplayed, createField } from '../../tasks/create_runtime_field';

describe('Create DataView runtime field', () => {
  before(() => {
    cleanKibana();
  });

  it('adds field to alert table', () => {
    const fieldName = 'field.name.alert.page';
    loginAndWaitForPage(ALERTS_URL);
    createCustomRuleEnabled(getNewRule());
    refreshPage();
    waitForAlertsToPopulate(500);
    openEventsViewerFieldsBrowser();

    createField(fieldName);
    assertFieldDisplayed(fieldName, 'alerts');
  });

  it('adds field to timeline', () => {
    const fieldName = 'field.name.timeline';

    loginAndWaitForPage(HOSTS_URL);
    openTimelineUsingToggle();
    populateTimeline();
    openTimelineFieldsBrowser();

    createField(fieldName);
    assertFieldDisplayed(fieldName);
  });
});
