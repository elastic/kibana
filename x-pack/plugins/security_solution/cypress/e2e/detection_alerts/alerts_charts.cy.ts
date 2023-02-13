/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { ALERTS_HISTOGRAM_LEGEND } from '../../screens/alerts';
import { waitForAlerts, selectAlertsHistogram } from '../../tasks/alerts';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';
import { GLOBAL_SEARCH_BAR_FILTER_ITEM } from '../../screens/search_bar';
import { HOVER_ACTIONS, TIMELINE_DATA_PROVIDERS_CONTAINER } from '../../screens/timeline';
import { closeTimelineUsingCloseButton } from '../../tasks/security_main';
import { openActiveTimeline } from '../../tasks/timeline';

describe('Alerts page charts', () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule(), 'new custom rule');
  });

  context('Histogram legend hover actions', () => {
    beforeEach(() => {
      visit(ALERTS_URL);
      waitForAlerts();
      selectAlertsHistogram();
    });

    it('Filter For', () => {
      cy.get(ALERTS_HISTOGRAM_LEGEND)
        .eq(0)
        .trigger('mouseover')
        .then(($el) => {
          const textValue = $el.text();
          cy.get(HOVER_ACTIONS.FILTER_FOR).should('exist');
          cy.get(HOVER_ACTIONS.FILTER_FOR).trigger('click', { force: true });
          cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should(
            'contain.text',
            `kibana.alert.rule.name: ${textValue}`
          );
        });
    });

    it('Filter Out', () => {
      cy.get(ALERTS_HISTOGRAM_LEGEND)
        .eq(0)
        .trigger('mouseover')
        .then(($el) => {
          const textValue = $el.text();
          cy.get(HOVER_ACTIONS.FILTER_OUT).should('exist');
          cy.get(HOVER_ACTIONS.FILTER_OUT).trigger('click', { force: true });
          cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should(
            'contain.text',
            `NOT kibana.alert.rule.name: ${textValue}`
          );
        });
    });

    it('Add To Timeline', () => {
      cy.get(ALERTS_HISTOGRAM_LEGEND)
        .eq(0)
        .trigger('mouseover')
        .then(($el) => {
          const textValue = $el.text();
          cy.get(HOVER_ACTIONS.ADD_TO_TIMELINE).should('exist');
          cy.get(HOVER_ACTIONS.ADD_TO_TIMELINE).trigger('click', { force: true });
          openActiveTimeline();
          cy.get(TIMELINE_DATA_PROVIDERS_CONTAINER).should('be.visible');
          cy.get(TIMELINE_DATA_PROVIDERS_CONTAINER).should('contain.text', textValue);
          closeTimelineUsingCloseButton();
        });
    });

    it('Copy to clipboard', () => {
      cy.get(ALERTS_HISTOGRAM_LEGEND)
        .eq(0)
        .trigger('mouseover')
        .then(($el) => {
          cy.get(HOVER_ACTIONS.COPY).should('exist');
        });
    });
  });
});
