/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { investigateFirstAlertInTimeline } from '../../../tasks/alerts';
import { INDICATOR_MATCH_ROW_RENDER, PROVIDER_BADGE } from '../../../screens/timeline';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { loadPrepackagedTimelineTemplates } from '../../../tasks/api_calls/timelines';
import {
  DETECTIONS_RULE_MANAGEMENT_URL,
  SECURITY_DETECTIONS_RULES_URL,
} from '../../../urls/navigation';
import { getNewThreatIndicatorRule, indicatorRuleMatchingDoc } from '../../../objects/rule';

import {
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  INDEX_PATTERNS_DETAILS,
  INDICATOR_INDEX_PATTERNS,
  INDICATOR_INDEX_QUERY,
  INDICATOR_MAPPING,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../../screens/rule_details';
import {
  waitForRulesTableToBeLoaded,
  goToRuleDetails,
} from '../../../tasks/alerts_detection_rules';
import { createRule } from '../../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import { login, visit, visitWithoutDateRange } from '../../../tasks/login';
import { getDetails } from '../../../tasks/rule_details';

describe('Indicator Match Rule', () => {
  const rule = getNewThreatIndicatorRule();

  before(() => {
    cleanKibana();
    cy.task('esArchiverLoad', 'threat_indicator');
    cy.task('esArchiverLoad', 'suspicious_source_event');
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(rule);
    login();
    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
    waitForRulesTableToBeLoaded();
  });

  after(() => {
    cy.task('esArchiverUnload', 'threat_indicator');
    cy.task('esArchiverUnload', 'suspicious_source_event');
  });

  it('Displays IM rule details', () => {
    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);

    cy.get(DEFINITION_DETAILS).within(() => {
      if (rule.index) {
        getDetails(INDEX_PATTERNS_DETAILS).should('have.text', rule.index.join(''));
      }
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', '*:*');
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Indicator Match');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      getDetails(INDICATOR_INDEX_PATTERNS).should('have.text', rule.threat_index.join(''));
      getDetails(INDICATOR_MAPPING).should(
        'have.text',
        `${rule.threat_mapping[0].entries[0].field} MATCHES ${rule.threat_mapping[0].entries[0].value}`
      );
      getDetails(INDICATOR_INDEX_QUERY).should('have.text', '*:*');
    });
  });

  it('Investigate alert in timeline', () => {
    const accessibilityText = `Press enter for options, or press space to begin dragging.`;

    loadPrepackagedTimelineTemplates();
    createRule(getNewThreatIndicatorRule({ rule_id: 'rule_testing', enabled: true }));
    visit(DETECTIONS_RULE_MANAGEMENT_URL);
    goToRuleDetails();
    waitForAlertsToPopulate();
    investigateFirstAlertInTimeline();

    cy.get(PROVIDER_BADGE).should('have.length', 3);
    cy.get(PROVIDER_BADGE).should(
      'have.text',
      `threat.enrichments.matched.atomic: "${
        indicatorRuleMatchingDoc.atomic
      }"threat.enrichments.matched.type: "indicator_match_rule"threat.enrichments.matched.field: "${
        getNewThreatIndicatorRule().threat_mapping[0].entries[0].field
      }"`
    );

    cy.get(INDICATOR_MATCH_ROW_RENDER).should(
      'have.text',
      `threat.enrichments.matched.field${
        getNewThreatIndicatorRule().threat_mapping[0].entries[0].field
      }${accessibilityText}matched${
        getNewThreatIndicatorRule().threat_mapping[0].entries[0].field
      }${
        indicatorRuleMatchingDoc.atomic
      }${accessibilityText}threat.enrichments.matched.typeindicator_match_rule${accessibilityText}provided` +
        ` byfeed.nameAbuseCH malware${accessibilityText}`
    );
  });
});
