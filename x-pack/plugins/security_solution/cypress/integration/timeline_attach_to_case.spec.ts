/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPage, loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { HOSTS_URL, CASES_URL } from '../urls/navigation';
import { openTimeline } from '../tasks/security_main';
import {
  createNewTimeline,
  attachTimelineToNewCase,
  openTimelineFromSettings,
  waitForTimelinesPanelToBeLoaded,
  attachTimelineToExistingCase,
} from '../tasks/timeline';
import { DESCRIPTION_INPUT } from '../screens/create_new_case';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { TIMELINE } from '../screens/timeline';
import { caseTimeline, case1 } from '../objects/case';
import { ALL_CASES_CREATE_NEW_CASE_TABLE_BTN, ALL_CASES_CASE } from '../screens/all_cases';
import { goToCreateNewCase } from '../tasks/all_cases';
import { createNewCase } from '../tasks/create_new_case';
import { navigateFromHeaderTo } from '../tasks/security_header';
import { HOSTS } from '../screens/security_header';

describe('attach timeline to case', () => {
  before(() => {
    esArchiverLoad('timeline');
    cy.server();
    cy.route('POST', '**api/cases*').as('createCase');
  });

  afterEach(() => {
    createNewTimeline();
  });

  after(() => {
    esArchiverUnload('timeline');
  });

  it('attach timeline to a new case', () => {
    loginAndWaitForPage(HOSTS_URL);
    openTimeline();

    openTimelineFromSettings();
    waitForTimelinesPanelToBeLoaded();

    cy.get(TIMELINE(caseTimeline.id!)).click();
    attachTimelineToNewCase();

    cy.location('origin').then((origin) => {
      cy.get(DESCRIPTION_INPUT).should(
        'have.text',
        `[${caseTimeline.title}](${origin}/app/security/timelines?timeline=(id:'${caseTimeline.id}',isOpen:!t))`
      );
    });
  });

  it('attach timeline to an existing case with no case', () => {
    loginAndWaitForPage(HOSTS_URL);
    openTimeline();

    openTimelineFromSettings();
    waitForTimelinesPanelToBeLoaded();

    cy.get(TIMELINE(caseTimeline.id!)).click();
    attachTimelineToExistingCase();

    cy.get(ALL_CASES_CREATE_NEW_CASE_TABLE_BTN).click();
    cy.location('origin').then((origin) => {
      cy.get(DESCRIPTION_INPUT).should(
        'have.text',
        `[${caseTimeline.title}](${origin}/app/security/timelines?timeline=(id:'${caseTimeline.id}',isOpen:!t))`
      );
    });
  });

  it('attach timeline to an existing case', () => {
    loginAndWaitForPageWithoutDateRange(CASES_URL);
    goToCreateNewCase();
    createNewCase(case1);

    cy.wait('@createCase').then((response) => {
      cy.wrap(response.status).should('eql', 200);
      const caseRes = JSON.parse(response.xhr.responseText);
      navigateFromHeaderTo(HOSTS);

      openTimeline();
      openTimelineFromSettings();
      waitForTimelinesPanelToBeLoaded();

      cy.get(TIMELINE(caseTimeline.id!)).click();
      attachTimelineToExistingCase();
      cy.get(ALL_CASES_CASE(caseRes.id!)).click();

      cy.location('origin').then((origin) => {
        cy.get(DESCRIPTION_INPUT).should(
          'have.text',
          `[${caseTimeline.title}](${origin}/app/security/timelines?timeline=(id:'${caseRes.id}',isOpen:!t))`
        );
      });
    });
  });
});
