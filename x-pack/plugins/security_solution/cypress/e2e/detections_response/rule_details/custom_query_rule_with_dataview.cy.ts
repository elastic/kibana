/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeline } from '../../../objects/timeline';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { formatMitreAttackDescription, getHumanizedDuration } from '../../../helpers/rules';
import { getDataViewRule } from '../../../objects/rule';
import { createRule } from '../../../tasks/api_calls/rules';
import {
  ADDITIONAL_LOOK_BACK_DETAILS,
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  FALSE_POSITIVES_DETAILS,
  removeExternalLinkText,
  INDEX_PATTERNS_DETAILS,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  MITRE_ATTACK_DETAILS,
  REFERENCE_URLS_DETAILS,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
  DATA_VIEW_DETAILS,
} from '../../../screens/rule_details';

import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { postDataView } from '../../../tasks/common';

import { esArchiverResetKibana } from '../../../tasks/es_archiver';
import { login } from '../../../tasks/login';
import { getDetails } from '../../../tasks/rule_details';

describe('Rule details, custom query rule with dataview', () => {
  const rule = getDataViewRule();
  const expectedUrls = rule.references?.join('');
  const expectedFalsePositives = rule.false_positives?.join('');
  const expectedTags = rule.tags?.join('');
  const mitreAttack = rule.threat;
  const expectedMitre = formatMitreAttackDescription(mitreAttack ?? []);

  beforeEach(() => {
    /* We don't call cleanKibana method on the before hook, instead we call esArchiverReseKibana on the before each. This is because we
      are creating a data view we'll use after and cleanKibana does not delete all the data views created, esArchiverReseKibana does.
      We don't use esArchiverReseKibana in all the tests because is a time-consuming method and we don't need to perform an exhaustive
      cleaning in all the other tests. */
    esArchiverResetKibana();
    createTimeline(getTimeline()).then((response) => {
      return createRule({
        ...rule,
        timeline_id: response.body.data.persistTimeline.timeline.savedObjectId,
        timeline_title: response.body.data.persistTimeline.timeline.title ?? '',
      });
    });
    if (rule.data_view_id != null) {
      postDataView(rule.data_view_id);
    }
    login();
  });

  it('Displays rule details', function () {
    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);
    cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', rule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(SEVERITY_DETAILS).should('have.text', 'High');
      getDetails(RISK_SCORE_DETAILS).should('have.text', rule.risk_score);
      getDetails(REFERENCE_URLS_DETAILS).should((details) => {
        expect(removeExternalLinkText(details.text())).equal(expectedUrls);
      });
      getDetails(FALSE_POSITIVES_DETAILS).should('have.text', expectedFalsePositives);
      getDetails(MITRE_ATTACK_DETAILS).should((mitre) => {
        expect(removeExternalLinkText(mitre.text())).equal(expectedMitre);
      });
      getDetails(TAGS_DETAILS).should('have.text', expectedTags);
    });
    cy.get(INVESTIGATION_NOTES_TOGGLE).click();
    cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', INVESTIGATION_NOTES_MARKDOWN);
    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(DATA_VIEW_DETAILS).should('have.text', rule.data_view_id);
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', rule.query);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
    });
    cy.get(DEFINITION_DETAILS).should('not.contain', INDEX_PATTERNS_DETAILS);
    cy.get(SCHEDULE_DETAILS).within(() => {
      getDetails(RUNS_EVERY_DETAILS).should('have.text', `${rule.interval}`);
      const humanizedDuration = getHumanizedDuration(rule.from ?? 'now-6m', rule.interval ?? '5m');
      getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should('have.text', `${humanizedDuration}`);
    });
  });
});
