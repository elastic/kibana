/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateFromHeaderTo } from '../../tasks/security_header';
import { ALERTS, TIMELINES } from '../../screens/security_header';
import { closeAlertFlyout, expandFirstAlert } from '../../tasks/alerts';
import {
  assertTourStepExist,
  assertTourStepNotExist,
  closeCreateCaseFlyout,
  completeTourWithActions,
  completeTourWithNextButton,
  addToCase,
  finishTour,
  goToStep,
  startTour,
} from '../../tasks/guided_onboarding';
import { cleanKibana } from '../../tasks/common';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { getNewRule } from '../../objects/rule';
import { ALERTS_URL, DASHBOARDS_URL } from '../../urls/navigation';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login, visit } from '../../tasks/login';
import { quitGlobalTour, startAlertsCasesTour } from '../../tasks/api_calls/tour';
import { AlertsCasesTourSteps } from '../../../public/common/components/guided_onboarding_tour/tour_config';

describe('Guided onboarding tour', () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled({ ...getNewRule(), customQuery: 'user.name:*' });
  });
  beforeEach(() => {
    startAlertsCasesTour();
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });
  after(() => {
    quitGlobalTour();
  });
  it('Completes the tour with next button clicks', () => {
    startTour();
    completeTourWithNextButton();
    finishTour();
    cy.url().should('include', DASHBOARDS_URL);
  });

  it('Completes the tour with action clicks', () => {
    startTour();
    completeTourWithActions();
    finishTour();
    cy.url().should('include', DASHBOARDS_URL);
  });

  // unhappy paths
  it('Resets the tour to step 1 when we navigate away', () => {
    startTour();
    goToStep(AlertsCasesTourSteps.expandEvent);
    assertTourStepExist(AlertsCasesTourSteps.expandEvent);
    assertTourStepNotExist(AlertsCasesTourSteps.pointToAlertName);
    navigateFromHeaderTo(TIMELINES);
    navigateFromHeaderTo(ALERTS);
    assertTourStepNotExist(AlertsCasesTourSteps.expandEvent);
    assertTourStepExist(AlertsCasesTourSteps.pointToAlertName);
  });

  describe('persists tour steps in flyout on flyout toggle', () => {
    const stepsInAlertsFlyout = [
      AlertsCasesTourSteps.reviewAlertDetailsFlyout,
      AlertsCasesTourSteps.addAlertToCase,
      AlertsCasesTourSteps.viewCase,
    ];

    const stepsInCasesFlyout = [AlertsCasesTourSteps.createCase, AlertsCasesTourSteps.submitCase];

    stepsInAlertsFlyout.forEach((step) => {
      it(`step: ${step}, resets to ${step}`, () => {
        startTour();
        goToStep(step);
        assertTourStepExist(step);
        closeAlertFlyout();
        assertTourStepNotExist(step);
        expandFirstAlert();
        assertTourStepExist(step);
      });
    });

    stepsInCasesFlyout.forEach((step) => {
      it(`step: ${step}, resets to ${AlertsCasesTourSteps.createCase}`, () => {
        startTour();
        goToStep(step);
        assertTourStepExist(step);
        closeCreateCaseFlyout();
        assertTourStepNotExist(step);
        addToCase();
        assertTourStepExist(AlertsCasesTourSteps.createCase);
      });
    });
  });
});
