/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { ALERTS_COUNT } from '../../screens/alerts';
import {
  clickAlertsHistogramLegend,
  clickAlertsHistogramLegendAddToTimeline,
  clickAlertsHistogramLegendFilterFor,
  clickAlertsHistogramLegendFilterOut,
  selectAlertsHistogram,
} from '../../tasks/alerts';
import { createRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';
import {
  GLOBAL_SEARCH_BAR_FILTER_ITEM,
  GLOBAL_SEARCH_BAR_FILTER_ITEM_DELETE,
} from '../../screens/search_bar';
import { TIMELINE_DATA_PROVIDERS_CONTAINER } from '../../screens/timeline';
import { closeTimelineUsingCloseButton } from '../../tasks/security_main';

describe('Histogram legend hover actions', { testIsolation: false }, () => {
  const ruleConfigs = getNewRule();
  before(() => {
    cleanKibana();
    login();
    createRule(getNewRule({ rule_id: 'new custom rule' }));
    visit(ALERTS_URL);
    selectAlertsHistogram();
  });

  it('Filter in/out should add a filter to KQL bar', function () {
    const expectedNumberOfAlerts = 2;
    clickAlertsHistogramLegend();
    clickAlertsHistogramLegendFilterFor(ruleConfigs.name);
    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should(
      'have.text',
      `kibana.alert.rule.name: ${ruleConfigs.name}`
    );
    cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);

    clickAlertsHistogramLegend();
    clickAlertsHistogramLegendFilterOut(ruleConfigs.name);
    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should(
      'have.text',
      `NOT kibana.alert.rule.name: ${ruleConfigs.name}`
    );
    cy.get(ALERTS_COUNT).should('not.exist');

    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM_DELETE).trigger('click');
    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('not.exist');
  });

  it('Add To Timeline', function () {
    clickAlertsHistogramLegend();
    clickAlertsHistogramLegendAddToTimeline(ruleConfigs.name);
    cy.get(TIMELINE_DATA_PROVIDERS_CONTAINER).should('be.visible');
    cy.get(TIMELINE_DATA_PROVIDERS_CONTAINER).should('contain.text', getNewRule().name);
    closeTimelineUsingCloseButton();
  });
});
