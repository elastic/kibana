/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreAttackDescription } from '../../helpers/rules';
import { indexPatterns, newThreatIndicatorRule } from '../../objects/rule';

import {
  ALERT_RULE_METHOD,
  ALERT_RULE_NAME,
  ALERT_RULE_RISK_SCORE,
  ALERT_RULE_SEVERITY,
  ALERT_RULE_VERSION,
  NUMBER_OF_ALERTS,
} from '../../screens/alerts';
import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULES_ROW,
  RULES_TABLE,
  RULE_SWITCH,
  SEVERITY,
} from '../../screens/alerts_detection_rules';
import {
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  ADDITIONAL_LOOK_BACK_DETAILS,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  FALSE_POSITIVES_DETAILS,
  getDetails,
  INDEX_PATTERNS_DETAILS,
  INDICATOR_INDEX_PATTERNS,
  INDICATOR_INDEX_QUERY,
  INDICATOR_MAPPING,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  MITRE_ATTACK_DETAILS,
  REFERENCE_URLS_DETAILS,
  removeExternalLinkText,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../screens/rule_details';

import {
  goToManageAlertsDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../../tasks/alerts';
import {
  changeToThreeHundredRowsPerPage,
  filterByCustomRules,
  goToCreateNewRule,
  goToRuleDetails,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForRulesToBeLoaded,
} from '../../tasks/alerts_detection_rules';
import { cleanKibana } from '../../tasks/common';
import {
  createAndActivateRule,
  fillAboutRuleAndContinue,
  fillDefineIndicatorMatchRuleAndContinue,
  fillIndexAndIndicatorIndexPattern,
  fillIndicatorMatchRow,
  fillScheduleRuleAndContinue,
  getCustomIndicatorQueryInput,
  getCustomQueryInput,
  getCustomQueryInvalidationText,
  getDefineContinueButton,
  getIndexPatternClearButton,
  getIndexPatternInvalidationText,
  getIndicatorAndButton,
  getIndicatorAtLeastOneInvalidationText,
  getIndicatorDeleteButton,
  getIndicatorIndex,
  getIndicatorIndexComboField,
  getIndicatorIndicatorIndex,
  getIndicatorInvalidationText,
  getIndicatorMappingComboField,
  getIndicatorOrButton,
  selectIndicatorMatchType,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { DETECTIONS_URL, RULE_CREATION } from '../../urls/navigation';

// Skipped for 7.12 FF - flaky tests
describe.skip('indicator match', () => {
  describe('Detection rules, Indicator Match', () => {
    const expectedUrls = newThreatIndicatorRule.referenceUrls.join('');
    const expectedFalsePositives = newThreatIndicatorRule.falsePositivesExamples.join('');
    const expectedTags = newThreatIndicatorRule.tags.join('');
    const expectedMitre = formatMitreAttackDescription(newThreatIndicatorRule.mitre);
    const expectedNumberOfRules = 1;
    const expectedNumberOfAlerts = 1;

    before(() => {
      cleanKibana();
      esArchiverLoad('threat_indicator');
      esArchiverLoad('threat_data');
    });
    after(() => {
      esArchiverUnload('threat_indicator');
      esArchiverUnload('threat_data');
    });

    describe('Creating new indicator match rules', () => {
      beforeEach(() => {
        loginAndWaitForPageWithoutDateRange(RULE_CREATION);
        selectIndicatorMatchType();
      });

      describe('Index patterns', () => {
        it('Contains a predefined index pattern', () => {
          getIndicatorIndex().should('have.text', indexPatterns.join(''));
        });

        it('Does NOT show invalidation text on initial page load if indicator index pattern is filled out', () => {
          getIndicatorIndicatorIndex().type(
            `${newThreatIndicatorRule.indicatorIndexPattern}{enter}`
          );
          getDefineContinueButton().click();
          getIndexPatternInvalidationText().should('not.exist');
        });

        it('Shows invalidation text when you try to continue without filling it out', () => {
          getIndexPatternClearButton().click();
          getIndicatorIndicatorIndex().type(
            `${newThreatIndicatorRule.indicatorIndexPattern}{enter}`
          );
          getDefineContinueButton().click();
          getIndexPatternInvalidationText().should('exist');
        });
      });

      describe('Indicator index patterns', () => {
        it('Contains empty index pattern', () => {
          getIndicatorIndicatorIndex().should('have.text', '');
        });

        it('Does NOT show invalidation text on initial page load', () => {
          getIndexPatternInvalidationText().should('not.exist');
        });

        it('Shows invalidation text if you try to continue without filling it out', () => {
          getDefineContinueButton().click();
          getIndexPatternInvalidationText().should('exist');
        });
      });

      describe('custom query input', () => {
        it('Has a default set of *:*', () => {
          getCustomQueryInput().should('have.text', '*:*');
        });

        it('Shows invalidation text if text is removed', () => {
          getCustomQueryInput().type('{selectall}{del}');
          getCustomQueryInvalidationText().should('exist');
        });
      });

      describe('custom indicator query input', () => {
        it('Has a default set of *:*', () => {
          getCustomIndicatorQueryInput().should('have.text', '*:*');
        });

        it('Shows invalidation text if text is removed', () => {
          getCustomIndicatorQueryInput().type('{selectall}{del}');
          getCustomQueryInvalidationText().should('exist');
        });
      });

      describe('Indicator mapping', () => {
        beforeEach(() => {
          fillIndexAndIndicatorIndexPattern(
            newThreatIndicatorRule.index,
            newThreatIndicatorRule.indicatorIndexPattern
          );
        });

        it('Does NOT show invalidation text on initial page load', () => {
          getIndicatorInvalidationText().should('not.exist');
        });

        it('Shows invalidation text when you try to press continue without filling anything out', () => {
          getDefineContinueButton().click();
          getIndicatorAtLeastOneInvalidationText().should('exist');
        });

        it('Shows invalidation text when the "AND" button is pressed and both the mappings are blank', () => {
          getIndicatorAndButton().click();
          getIndicatorInvalidationText().should('exist');
        });

        it('Shows invalidation text when the "OR" button is pressed and both the mappings are blank', () => {
          getIndicatorOrButton().click();
          getIndicatorInvalidationText().should('exist');
        });

        it('Does NOT show invalidation text when there is a valid "index field" and a valid "indicator index field"', () => {
          fillIndicatorMatchRow({
            indexField: newThreatIndicatorRule.indicatorMapping,
            indicatorIndexField: newThreatIndicatorRule.indicatorIndexField,
          });
          getDefineContinueButton().click();
          getIndicatorInvalidationText().should('not.exist');
        });

        it('Shows invalidation text when there is an invalid "index field" and a valid "indicator index field"', () => {
          fillIndicatorMatchRow({
            indexField: 'non-existent-value',
            indicatorIndexField: newThreatIndicatorRule.indicatorIndexField,
            validColumns: 'indicatorField',
          });
          getDefineContinueButton().click();
          getIndicatorInvalidationText().should('exist');
        });

        it('Shows invalidation text when there is a valid "index field" and an invalid "indicator index field"', () => {
          fillIndicatorMatchRow({
            indexField: newThreatIndicatorRule.indicatorMapping,
            indicatorIndexField: 'non-existent-value',
            validColumns: 'indexField',
          });
          getDefineContinueButton().click();
          getIndicatorInvalidationText().should('exist');
        });

        it('Deletes the first row when you have two rows. Both rows valid rows of "index fields" and valid "indicator index fields". The second row should become the first row', () => {
          fillIndicatorMatchRow({
            indexField: newThreatIndicatorRule.indicatorMapping,
            indicatorIndexField: newThreatIndicatorRule.indicatorIndexField,
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: 'agent.name',
            indicatorIndexField: newThreatIndicatorRule.indicatorIndexField,
            validColumns: 'indicatorField',
          });
          getIndicatorDeleteButton().click();
          getIndicatorIndexComboField().should('have.text', 'agent.name');
          getIndicatorMappingComboField().should(
            'have.text',
            newThreatIndicatorRule.indicatorIndexField
          );
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });

        it('Deletes the first row when you have two rows. Both rows have valid "index fields" and invalid "indicator index fields". The second row should become the first row', () => {
          fillIndicatorMatchRow({
            indexField: newThreatIndicatorRule.indicatorMapping,
            indicatorIndexField: 'non-existent-value',
            validColumns: 'indexField',
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: newThreatIndicatorRule.indicatorMapping,
            indicatorIndexField: 'second-non-existent-value',
            validColumns: 'indexField',
          });
          getIndicatorDeleteButton().click();
          getIndicatorMappingComboField().should('have.text', 'second-non-existent-value');
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });

        it('Deletes the first row when you have two rows. Both rows have valid "indicator index fields" and invalid "index fields". The second row should become the first row', () => {
          fillIndicatorMatchRow({
            indexField: 'non-existent-value',
            indicatorIndexField: newThreatIndicatorRule.indicatorIndexField,
            validColumns: 'indicatorField',
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: 'second-non-existent-value',
            indicatorIndexField: newThreatIndicatorRule.indicatorIndexField,
            validColumns: 'indicatorField',
          });
          getIndicatorDeleteButton().click();
          getIndicatorIndexComboField().should('have.text', 'second-non-existent-value');
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });

        it('Deletes the first row of data but not the UI elements and the text defaults back to the placeholder of Search', () => {
          fillIndicatorMatchRow({
            indexField: newThreatIndicatorRule.indicatorMapping,
            indicatorIndexField: newThreatIndicatorRule.indicatorIndexField,
          });
          getIndicatorDeleteButton().click();
          getIndicatorIndexComboField().should('text', 'Search');
          getIndicatorMappingComboField().should('text', 'Search');
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });

        it('Deletes the second row when you have three rows. The first row is valid data, the second row is invalid data, and the third row is valid data. Third row should shift up correctly', () => {
          fillIndicatorMatchRow({
            indexField: newThreatIndicatorRule.indicatorMapping,
            indicatorIndexField: newThreatIndicatorRule.indicatorIndexField,
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: 'non-existent-value',
            indicatorIndexField: 'non-existent-value',
            validColumns: 'none',
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 3,
            indexField: newThreatIndicatorRule.indicatorMapping,
            indicatorIndexField: newThreatIndicatorRule.indicatorIndexField,
          });
          getIndicatorDeleteButton(2).click();
          getIndicatorIndexComboField(1).should('text', newThreatIndicatorRule.indicatorMapping);
          getIndicatorMappingComboField(1).should(
            'text',
            newThreatIndicatorRule.indicatorIndexField
          );
          getIndicatorIndexComboField(2).should('text', newThreatIndicatorRule.indicatorMapping);
          getIndicatorMappingComboField(2).should(
            'text',
            newThreatIndicatorRule.indicatorIndexField
          );
          getIndicatorIndexComboField(3).should('not.exist');
          getIndicatorMappingComboField(3).should('not.exist');
        });

        it('Can add two OR rows and delete the second row. The first row has invalid data and the second row has valid data. The first row is deleted and the second row shifts up correctly.', () => {
          fillIndicatorMatchRow({
            indexField: 'non-existent-value-one',
            indicatorIndexField: 'non-existent-value-two',
            validColumns: 'none',
          });
          getIndicatorOrButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: newThreatIndicatorRule.indicatorMapping,
            indicatorIndexField: newThreatIndicatorRule.indicatorIndexField,
          });
          getIndicatorDeleteButton().click();
          getIndicatorIndexComboField().should('text', newThreatIndicatorRule.indicatorMapping);
          getIndicatorMappingComboField().should(
            'text',
            newThreatIndicatorRule.indicatorIndexField
          );
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });
      });
    });

    describe('Generating signals', () => {
      beforeEach(() => {
        cleanKibana();
        loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
        waitForAlertsPanelToBeLoaded();
        waitForAlertsIndexToBeCreated();
        goToManageAlertsDetectionRules();
        waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
        goToCreateNewRule();
        selectIndicatorMatchType();
      });

      it('Creates and activates a new Indicator Match rule', () => {
        fillDefineIndicatorMatchRuleAndContinue(newThreatIndicatorRule);
        fillAboutRuleAndContinue(newThreatIndicatorRule);
        fillScheduleRuleAndContinue(newThreatIndicatorRule);
        createAndActivateRule();

        cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

        changeToThreeHundredRowsPerPage();
        waitForRulesToBeLoaded();

        cy.get(RULES_TABLE).then(($table) => {
          cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
        });

        filterByCustomRules();

        cy.get(RULES_TABLE).then(($table) => {
          cy.wrap($table.find(RULES_ROW).length).should('eql', 1);
        });
        cy.get(RULE_NAME).should('have.text', newThreatIndicatorRule.name);
        cy.get(RISK_SCORE).should('have.text', newThreatIndicatorRule.riskScore);
        cy.get(SEVERITY).should('have.text', newThreatIndicatorRule.severity);
        cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

        goToRuleDetails();

        cy.get(RULE_NAME_HEADER).should('have.text', `${newThreatIndicatorRule.name}`);
        cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', newThreatIndicatorRule.description);
        cy.get(ABOUT_DETAILS).within(() => {
          getDetails(SEVERITY_DETAILS).should('have.text', newThreatIndicatorRule.severity);
          getDetails(RISK_SCORE_DETAILS).should('have.text', newThreatIndicatorRule.riskScore);
          getDetails(REFERENCE_URLS_DETAILS).should((details) => {
            expect(removeExternalLinkText(details.text())).equal(expectedUrls);
          });
          getDetails(FALSE_POSITIVES_DETAILS).should('have.text', expectedFalsePositives);
          getDetails(MITRE_ATTACK_DETAILS).should((mitre) => {
            expect(removeExternalLinkText(mitre.text())).equal(expectedMitre);
          });
          getDetails(TAGS_DETAILS).should('have.text', expectedTags);
        });
        cy.get(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
        cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', INVESTIGATION_NOTES_MARKDOWN);

        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(INDEX_PATTERNS_DETAILS).should(
            'have.text',
            newThreatIndicatorRule.index!.join('')
          );
          getDetails(CUSTOM_QUERY_DETAILS).should('have.text', '*:*');
          getDetails(RULE_TYPE_DETAILS).should('have.text', 'Indicator Match');
          getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
          getDetails(INDICATOR_INDEX_PATTERNS).should(
            'have.text',
            newThreatIndicatorRule.indicatorIndexPattern.join('')
          );
          getDetails(INDICATOR_MAPPING).should(
            'have.text',
            `${newThreatIndicatorRule.indicatorMapping} MATCHES ${newThreatIndicatorRule.indicatorIndexField}`
          );
          getDetails(INDICATOR_INDEX_QUERY).should('have.text', '*:*');
        });

        cy.get(SCHEDULE_DETAILS).within(() => {
          getDetails(RUNS_EVERY_DETAILS).should(
            'have.text',
            `${newThreatIndicatorRule.runsEvery.interval}${newThreatIndicatorRule.runsEvery.type}`
          );
          getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should(
            'have.text',
            `${newThreatIndicatorRule.lookBack.interval}${newThreatIndicatorRule.lookBack.type}`
          );
        });

        waitForTheRuleToBeExecuted();
        waitForAlertsToPopulate();

        cy.get(NUMBER_OF_ALERTS).should('have.text', expectedNumberOfAlerts);
        cy.get(ALERT_RULE_NAME).first().should('have.text', newThreatIndicatorRule.name);
        cy.get(ALERT_RULE_VERSION).first().should('have.text', '1');
        cy.get(ALERT_RULE_METHOD).first().should('have.text', 'threat_match');
        cy.get(ALERT_RULE_SEVERITY)
          .first()
          .should('have.text', newThreatIndicatorRule.severity.toLowerCase());
        cy.get(ALERT_RULE_RISK_SCORE).first().should('have.text', newThreatIndicatorRule.riskScore);
      });
    });
  });
});
