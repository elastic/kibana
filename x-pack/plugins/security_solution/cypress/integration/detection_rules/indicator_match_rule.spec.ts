/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreAttackDescription } from '../../helpers/rules';
import {
  getIndexPatterns,
  getNewThreatIndicatorRule,
  getThreatIndexPatterns,
} from '../../objects/rule';

import {
  ALERT_RULE_NAME,
  ALERT_RULE_RISK_SCORE,
  ALERT_RULE_SEVERITY,
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
  INDICATOR_PREFIX_OVERRIDE,
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
import { INDICATOR_MATCH_ROW_RENDER, PROVIDER_BADGE } from '../../screens/timeline';
import {
  goToManageAlertsDetectionRules,
  investigateFirstAlertInTimeline,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../../tasks/alerts';
import {
  changeRowsPerPageTo100,
  duplicateFirstRule,
  duplicateSelectedRules,
  duplicateRuleFromMenu,
  filterByCustomRules,
  goToCreateNewRule,
  goToRuleDetails,
  waitForRulesTableToBeLoaded,
  selectNumberOfRules,
  checkDuplicatedRule,
} from '../../tasks/alerts_detection_rules';
import { createCustomIndicatorRule } from '../../tasks/api_calls/rules';
import { loadPrepackagedTimelineTemplates } from '../../tasks/api_calls/timelines';
import { cleanKibana, reload } from '../../tasks/common';
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
import {
  SCHEDULE_INTERVAL_AMOUNT_INPUT,
  SCHEDULE_INTERVAL_UNITS_INPUT,
  SCHEDULE_LOOKBACK_AMOUNT_INPUT,
  SCHEDULE_LOOKBACK_UNITS_INPUT,
} from '../../screens/create_new_rule';
import { goBackToRuleDetails, waitForKibana } from '../../tasks/edit_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import { goBackToAllRulesTable } from '../../tasks/rule_details';

import { ALERTS_URL, RULE_CREATION } from '../../urls/navigation';
const DEFAULT_THREAT_MATCH_QUERY = '@timestamp >= "now-30d"';

describe('indicator match', () => {
  describe('Detection rules, Indicator Match', () => {
    const expectedUrls = getNewThreatIndicatorRule().referenceUrls.join('');
    const expectedFalsePositives = getNewThreatIndicatorRule().falsePositivesExamples.join('');
    const expectedTags = getNewThreatIndicatorRule().tags.join('');
    const expectedMitre = formatMitreAttackDescription(getNewThreatIndicatorRule().mitre);
    const expectedNumberOfRules = 1;
    const expectedNumberOfAlerts = '1 alert';

    before(() => {
      cleanKibana();
      esArchiverLoad('threat_indicator');
      esArchiverLoad('suspicious_source_event');
    });
    after(() => {
      esArchiverUnload('threat_indicator');
      esArchiverUnload('suspicious_source_event');
    });

    describe('Creating new indicator match rules', () => {
      beforeEach(() => {
        loginAndWaitForPageWithoutDateRange(RULE_CREATION);
        selectIndicatorMatchType();
      });

      describe('Index patterns', () => {
        it('Contains a predefined index pattern', () => {
          getIndicatorIndex().should('have.text', getIndexPatterns().join(''));
        });

        it('Does NOT show invalidation text on initial page load if indicator index pattern is filled out', () => {
          getDefineContinueButton().click();
          getIndexPatternInvalidationText().should('not.exist');
        });

        it('Shows invalidation text when you try to continue without filling it out', () => {
          getIndexPatternClearButton().click();
          getIndicatorIndicatorIndex().type(`{backspace}{enter}`);
          getDefineContinueButton().click();
          getIndexPatternInvalidationText().should('exist');
        });
      });

      describe('Indicator index patterns', () => {
        it('Contains a predefined index pattern', () => {
          getIndicatorIndicatorIndex().should('have.text', getThreatIndexPatterns().join(''));
        });

        it('Does NOT show invalidation text on initial page load', () => {
          getIndexPatternInvalidationText().should('not.exist');
        });

        it('Shows invalidation text if you try to continue without filling it out', () => {
          getIndicatorIndicatorIndex().type(`{backspace}{enter}`);
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
        it(`Has a default set of ${DEFAULT_THREAT_MATCH_QUERY}`, () => {
          getCustomIndicatorQueryInput().should('have.text', DEFAULT_THREAT_MATCH_QUERY);
        });

        it('Shows invalidation text if text is removed', () => {
          getCustomIndicatorQueryInput().type('{selectall}{del}');
          getCustomQueryInvalidationText().should('exist');
        });
      });

      describe('Indicator mapping', () => {
        beforeEach(() => {
          fillIndexAndIndicatorIndexPattern(
            getNewThreatIndicatorRule().index,
            getNewThreatIndicatorRule().indicatorIndexPattern
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
            indexField: getNewThreatIndicatorRule().indicatorMappingField,
            indicatorIndexField: getNewThreatIndicatorRule().indicatorIndexField,
          });
          getDefineContinueButton().click();
          getIndicatorInvalidationText().should('not.exist');
        });

        it('Shows invalidation text when there is an invalid "index field" and a valid "indicator index field"', () => {
          fillIndicatorMatchRow({
            indexField: 'non-existent-value',
            indicatorIndexField: getNewThreatIndicatorRule().indicatorIndexField,
            validColumns: 'indicatorField',
          });
          getDefineContinueButton().click();
          getIndicatorInvalidationText().should('exist');
        });

        it('Shows invalidation text when there is a valid "index field" and an invalid "indicator index field"', () => {
          fillIndicatorMatchRow({
            indexField: getNewThreatIndicatorRule().indicatorMappingField,
            indicatorIndexField: 'non-existent-value',
            validColumns: 'indexField',
          });
          getDefineContinueButton().click();
          getIndicatorInvalidationText().should('exist');
        });

        it('Deletes the first row when you have two rows. Both rows valid rows of "index fields" and valid "indicator index fields". The second row should become the first row', () => {
          fillIndicatorMatchRow({
            indexField: getNewThreatIndicatorRule().indicatorMappingField,
            indicatorIndexField: getNewThreatIndicatorRule().indicatorIndexField,
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: 'agent.name',
            indicatorIndexField: getNewThreatIndicatorRule().indicatorIndexField,
            validColumns: 'indicatorField',
          });
          getIndicatorDeleteButton().click();
          getIndicatorIndexComboField().should('have.text', 'agent.name');
          getIndicatorMappingComboField().should(
            'have.text',
            getNewThreatIndicatorRule().indicatorIndexField
          );
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });

        it('Deletes the first row when you have two rows. Both rows have valid "index fields" and invalid "indicator index fields". The second row should become the first row', () => {
          fillIndicatorMatchRow({
            indexField: getNewThreatIndicatorRule().indicatorMappingField,
            indicatorIndexField: 'non-existent-value',
            validColumns: 'indexField',
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: getNewThreatIndicatorRule().indicatorMappingField,
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
            indicatorIndexField: getNewThreatIndicatorRule().indicatorIndexField,
            validColumns: 'indicatorField',
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: 'second-non-existent-value',
            indicatorIndexField: getNewThreatIndicatorRule().indicatorIndexField,
            validColumns: 'indicatorField',
          });
          getIndicatorDeleteButton().click();
          getIndicatorIndexComboField().should('have.text', 'second-non-existent-value');
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });

        it('Deletes the first row of data but not the UI elements and the text defaults back to the placeholder of Search', () => {
          fillIndicatorMatchRow({
            indexField: getNewThreatIndicatorRule().indicatorMappingField,
            indicatorIndexField: getNewThreatIndicatorRule().indicatorIndexField,
          });
          getIndicatorDeleteButton().click();
          getIndicatorIndexComboField().should('text', 'Search');
          getIndicatorMappingComboField().should('text', 'Search');
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });

        it('Deletes the second row when you have three rows. The first row is valid data, the second row is invalid data, and the third row is valid data. Third row should shift up correctly', () => {
          fillIndicatorMatchRow({
            indexField: getNewThreatIndicatorRule().indicatorMappingField,
            indicatorIndexField: getNewThreatIndicatorRule().indicatorIndexField,
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
            indexField: getNewThreatIndicatorRule().indicatorMappingField,
            indicatorIndexField: getNewThreatIndicatorRule().indicatorIndexField,
          });
          getIndicatorDeleteButton(2).click();
          getIndicatorIndexComboField(1).should(
            'text',
            getNewThreatIndicatorRule().indicatorMappingField
          );
          getIndicatorMappingComboField(1).should(
            'text',
            getNewThreatIndicatorRule().indicatorIndexField
          );
          getIndicatorIndexComboField(2).should(
            'text',
            getNewThreatIndicatorRule().indicatorMappingField
          );
          getIndicatorMappingComboField(2).should(
            'text',
            getNewThreatIndicatorRule().indicatorIndexField
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
            indexField: getNewThreatIndicatorRule().indicatorMappingField,
            indicatorIndexField: getNewThreatIndicatorRule().indicatorIndexField,
          });
          getIndicatorDeleteButton().click();
          getIndicatorIndexComboField().should(
            'text',
            getNewThreatIndicatorRule().indicatorMappingField
          );
          getIndicatorMappingComboField().should(
            'text',
            getNewThreatIndicatorRule().indicatorIndexField
          );
          getIndicatorIndexComboField(2).should('not.exist');
          getIndicatorMappingComboField(2).should('not.exist');
        });
      });

      describe('Schedule', () => {
        it('IM rule has 1h time interval and lookback by default', () => {
          selectIndicatorMatchType();
          fillDefineIndicatorMatchRuleAndContinue(getNewThreatIndicatorRule());
          fillAboutRuleAndContinue(getNewThreatIndicatorRule());

          cy.get(SCHEDULE_INTERVAL_AMOUNT_INPUT).invoke('val').should('eql', '1');
          cy.get(SCHEDULE_INTERVAL_UNITS_INPUT).invoke('val').should('eql', 'h');
          cy.get(SCHEDULE_LOOKBACK_AMOUNT_INPUT).invoke('val').should('eql', '5');
          cy.get(SCHEDULE_LOOKBACK_UNITS_INPUT).invoke('val').should('eql', 'm');
        });
      });
    });

    describe('Generating signals', () => {
      beforeEach(() => {
        cleanKibana();
        loginAndWaitForPageWithoutDateRange(ALERTS_URL);
      });

      // Skipping until we fix dupe mitigation
      it.skip('Creates and activates a new Indicator Match rule', () => {
        waitForAlertsPanelToBeLoaded();
        waitForAlertsIndexToBeCreated();
        goToManageAlertsDetectionRules();
        waitForRulesTableToBeLoaded();
        goToCreateNewRule();
        selectIndicatorMatchType();
        fillDefineIndicatorMatchRuleAndContinue(getNewThreatIndicatorRule());
        fillAboutRuleAndContinue(getNewThreatIndicatorRule());
        fillScheduleRuleAndContinue(getNewThreatIndicatorRule());
        createAndActivateRule();

        cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

        changeRowsPerPageTo100();

        cy.get(RULES_TABLE).then(($table) => {
          cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
        });

        filterByCustomRules();

        cy.get(RULES_TABLE).then(($table) => {
          cy.wrap($table.find(RULES_ROW).length).should('eql', 1);
        });
        cy.get(RULE_NAME).should('have.text', getNewThreatIndicatorRule().name);
        cy.get(RISK_SCORE).should('have.text', getNewThreatIndicatorRule().riskScore);
        cy.get(SEVERITY).should('have.text', getNewThreatIndicatorRule().severity);
        cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

        goToRuleDetails();

        cy.get(RULE_NAME_HEADER).should('contain', `${getNewThreatIndicatorRule().name}`);
        cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', getNewThreatIndicatorRule().description);
        cy.get(ABOUT_DETAILS).within(() => {
          getDetails(SEVERITY_DETAILS).should('have.text', getNewThreatIndicatorRule().severity);
          getDetails(RISK_SCORE_DETAILS).should('have.text', getNewThreatIndicatorRule().riskScore);
          getDetails(INDICATOR_PREFIX_OVERRIDE).should(
            'have.text',
            getNewThreatIndicatorRule().threatIndicatorPath
          );
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
            getNewThreatIndicatorRule().index.join('')
          );
          getDetails(CUSTOM_QUERY_DETAILS).should('have.text', '*:*');
          getDetails(RULE_TYPE_DETAILS).should('have.text', 'Indicator Match');
          getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
          getDetails(INDICATOR_INDEX_PATTERNS).should(
            'have.text',
            getNewThreatIndicatorRule().indicatorIndexPattern.join('')
          );
          getDetails(INDICATOR_MAPPING).should(
            'have.text',
            `${getNewThreatIndicatorRule().indicatorMappingField} MATCHES ${
              getNewThreatIndicatorRule().indicatorIndexField
            }`
          );
          getDetails(INDICATOR_INDEX_QUERY).should('have.text', '*:*');
        });

        cy.get(SCHEDULE_DETAILS).within(() => {
          getDetails(RUNS_EVERY_DETAILS).should(
            'have.text',
            `${getNewThreatIndicatorRule().runsEvery.interval}${
              getNewThreatIndicatorRule().runsEvery.type
            }`
          );
          getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should(
            'have.text',
            `${getNewThreatIndicatorRule().lookBack.interval}${
              getNewThreatIndicatorRule().lookBack.type
            }`
          );
        });

        waitForTheRuleToBeExecuted();
        waitForAlertsToPopulate();

        cy.get(NUMBER_OF_ALERTS).should('have.text', expectedNumberOfAlerts);
        cy.get(ALERT_RULE_NAME).first().should('have.text', getNewThreatIndicatorRule().name);
        cy.get(ALERT_RULE_SEVERITY)
          .first()
          .should('have.text', getNewThreatIndicatorRule().severity.toLowerCase());
        cy.get(ALERT_RULE_RISK_SCORE)
          .first()
          .should('have.text', getNewThreatIndicatorRule().riskScore);
      });

      it.skip('Investigate alert in timeline', () => {
        const accessibilityText = `Press enter for options, or press space to begin dragging.`;

        loadPrepackagedTimelineTemplates();

        goToManageAlertsDetectionRules();
        createCustomIndicatorRule(getNewThreatIndicatorRule());

        reload();
        goToRuleDetails();
        waitForAlertsToPopulate();
        investigateFirstAlertInTimeline();

        cy.get(PROVIDER_BADGE).should('have.length', 3);
        cy.get(PROVIDER_BADGE).should(
          'have.text',
          `threat.enrichments.matched.atomic: "${
            getNewThreatIndicatorRule().atomic
          }"threat.enrichments.matched.type: "indicator_match_rule"threat.enrichments.matched.field: "${
            getNewThreatIndicatorRule().indicatorMappingField
          }"`
        );

        cy.get(INDICATOR_MATCH_ROW_RENDER).should(
          'have.text',
          `threat.enrichments.matched.field${
            getNewThreatIndicatorRule().indicatorMappingField
          }${accessibilityText}matched${getNewThreatIndicatorRule().indicatorMappingField}${
            getNewThreatIndicatorRule().atomic
          }${accessibilityText}threat.enrichments.matched.typeindicator_match_rule${accessibilityText}`
        );
      });
    });

    describe('Duplicates the indicator rule', () => {
      beforeEach(() => {
        cleanKibana();
        loginAndWaitForPageWithoutDateRange(ALERTS_URL);
        goToManageAlertsDetectionRules();
        createCustomIndicatorRule(getNewThreatIndicatorRule());
        reload();
      });

      it('Allows the rule to be duplicated from the table', () => {
        waitForKibana();
        duplicateFirstRule();
        goBackToRuleDetails();
        goBackToAllRulesTable();
        checkDuplicatedRule();
      });

      it("Allows the rule to be duplicated from the table's bulk actions", () => {
        waitForKibana();
        selectNumberOfRules(1);
        duplicateSelectedRules();
        checkDuplicatedRule();
      });

      it('Allows the rule to be duplicated from the edit screen', () => {
        waitForKibana();
        goToRuleDetails();
        duplicateRuleFromMenu();
        goBackToRuleDetails();
        goBackToAllRulesTable();
        reload();
        checkDuplicatedRule();
      });
    });
  });
});
