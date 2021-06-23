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
  JSON_LINES,
  TABLE_CELL,
  TABLE_ROWS,
  THREAT_CONTENT,
  THREAT_DETAILS_VIEW,
  THREAT_INTEL_TAB,
  THREAT_SUMMARY_VIEW,
  TITLE,
} from '../../screens/alerts_details';
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
  TIMELINE_FIELD,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../screens/rule_details';
import { INDICATOR_MATCH_ROW_RENDER, PROVIDER_BADGE } from '../../screens/timeline';

import {
  expandFirstAlert,
  goToManageAlertsDetectionRules,
  investigateFirstAlertInTimeline,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../../tasks/alerts';
import {
  openJsonView,
  openThreatIndicatorDetails,
  scrollJsonViewToBottom,
} from '../../tasks/alerts_details';
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
import { goBackToRuleDetails, waitForKibana } from '../../tasks/edit_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import { addsFieldsToTimeline, goBackToAllRulesTable } from '../../tasks/rule_details';

import { DETECTIONS_URL, RULE_CREATION } from '../../urls/navigation';

describe('indicator match', () => {
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
            indexField: newThreatIndicatorRule.indicatorMappingField,
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
            indexField: newThreatIndicatorRule.indicatorMappingField,
            indicatorIndexField: 'non-existent-value',
            validColumns: 'indexField',
          });
          getDefineContinueButton().click();
          getIndicatorInvalidationText().should('exist');
        });

        it('Deletes the first row when you have two rows. Both rows valid rows of "index fields" and valid "indicator index fields". The second row should become the first row', () => {
          fillIndicatorMatchRow({
            indexField: newThreatIndicatorRule.indicatorMappingField,
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
            indexField: newThreatIndicatorRule.indicatorMappingField,
            indicatorIndexField: 'non-existent-value',
            validColumns: 'indexField',
          });
          getIndicatorAndButton().click();
          fillIndicatorMatchRow({
            rowNumber: 2,
            indexField: newThreatIndicatorRule.indicatorMappingField,
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
            indexField: newThreatIndicatorRule.indicatorMappingField,
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
            indexField: newThreatIndicatorRule.indicatorMappingField,
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
            indexField: newThreatIndicatorRule.indicatorMappingField,
            indicatorIndexField: newThreatIndicatorRule.indicatorIndexField,
          });
          getIndicatorDeleteButton(2).click();
          getIndicatorIndexComboField(1).should(
            'text',
            newThreatIndicatorRule.indicatorMappingField
          );
          getIndicatorMappingComboField(1).should(
            'text',
            newThreatIndicatorRule.indicatorIndexField
          );
          getIndicatorIndexComboField(2).should(
            'text',
            newThreatIndicatorRule.indicatorMappingField
          );
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
            indexField: newThreatIndicatorRule.indicatorMappingField,
            indicatorIndexField: newThreatIndicatorRule.indicatorIndexField,
          });
          getIndicatorDeleteButton().click();
          getIndicatorIndexComboField().should(
            'text',
            newThreatIndicatorRule.indicatorMappingField
          );
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
      });

      it('Creates and activates a new Indicator Match rule', () => {
        waitForAlertsPanelToBeLoaded();
        waitForAlertsIndexToBeCreated();
        goToManageAlertsDetectionRules();
        waitForRulesTableToBeLoaded();
        goToCreateNewRule();
        selectIndicatorMatchType();
        fillDefineIndicatorMatchRuleAndContinue(newThreatIndicatorRule);
        fillAboutRuleAndContinue(newThreatIndicatorRule);
        fillScheduleRuleAndContinue(newThreatIndicatorRule);
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
        cy.get(RULE_NAME).should('have.text', newThreatIndicatorRule.name);
        cy.get(RISK_SCORE).should('have.text', newThreatIndicatorRule.riskScore);
        cy.get(SEVERITY).should('have.text', newThreatIndicatorRule.severity);
        cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

        goToRuleDetails();

        cy.get(RULE_NAME_HEADER).should('contain', `${newThreatIndicatorRule.name}`);
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
            newThreatIndicatorRule.index.join('')
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
            `${newThreatIndicatorRule.indicatorMappingField} MATCHES ${newThreatIndicatorRule.indicatorIndexField}`
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

      it('Investigate alert in timeline', () => {
        const accessibilityText = `Press enter for options, or press space to begin dragging.`;
        const threatIndicatorPath =
          '../../../x-pack/test/security_solution_cypress/es_archives/threat_indicator/data.json';

        loadPrepackagedTimelineTemplates();

        goToManageAlertsDetectionRules();
        createCustomIndicatorRule(newThreatIndicatorRule);

        reload();
        goToRuleDetails();
        waitForAlertsToPopulate();
        investigateFirstAlertInTimeline();

        cy.get(PROVIDER_BADGE).should('have.length', 3);
        cy.get(PROVIDER_BADGE).should(
          'have.text',
          `threat.indicator.matched.atomic: "${newThreatIndicatorRule.atomic}"threat.indicator.matched.type: "${newThreatIndicatorRule.type}"threat.indicator.matched.field: "${newThreatIndicatorRule.indicatorMappingField}"`
        );

        cy.readFile(threatIndicatorPath).then((threatIndicator) => {
          cy.get(INDICATOR_MATCH_ROW_RENDER).should(
            'have.text',
            `threat.indicator.matched.field${newThreatIndicatorRule.indicatorMappingField}${accessibilityText}matched${newThreatIndicatorRule.indicatorMappingField}${newThreatIndicatorRule.atomic}${accessibilityText}threat.indicator.matched.type${newThreatIndicatorRule.type}${accessibilityText}fromthreat.indicator.event.dataset${threatIndicator.value.source.event.dataset}${accessibilityText}:threat.indicator.event.reference${threatIndicator.value.source.event.reference}(opens in a new tab or window)${accessibilityText}`
          );
        });
      });
    });

    describe('Enrichment', () => {
      const fieldSearch = 'threat.indicator.matched';
      const fields = [
        'threat.indicator.matched.atomic',
        'threat.indicator.matched.type',
        'threat.indicator.matched.field',
      ];
      const expectedFieldsText = [
        newThreatIndicatorRule.atomic,
        newThreatIndicatorRule.type,
        newThreatIndicatorRule.indicatorMappingField,
      ];

      const expectedEnrichment = [
        { line: 4, text: '  "threat": {' },
        {
          line: 3,
          text:
            '    "indicator": "{\\"first_seen\\":\\"2021-03-10T08:02:14.000Z\\",\\"file\\":{\\"size\\":80280,\\"pe\\":{},\\"type\\":\\"elf\\",\\"hash\\":{\\"sha256\\":\\"a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3\\",\\"tlsh\\":\\"6D7312E017B517CC1371A8353BED205E9128223972AE35302E97528DF957703BAB2DBE\\",\\"ssdeep\\":\\"1536:87vbq1lGAXSEYQjbChaAU2yU23M51DjZgSQAvcYkFtZTjzBht5:8D+CAXFYQChaAUk5ljnQssL\\",\\"md5\\":\\"9b6c3518a91d23ed77504b5416bfb5b3\\"}},\\"type\\":\\"file\\",\\"event\\":{\\"reference\\":\\"https://urlhaus-api.abuse.ch/v1/download/a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3/\\",\\"ingested\\":\\"2021-03-10T14:51:09.809069Z\\",\\"created\\":\\"2021-03-10T14:51:07.663Z\\",\\"kind\\":\\"enrichment\\",\\"module\\":\\"threatintel\\",\\"category\\":\\"threat\\",\\"type\\":\\"indicator\\",\\"dataset\\":\\"threatintel.abusemalware\\"},\\"matched\\":{\\"atomic\\":\\"a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3\\",\\"field\\":\\"myhash.mysha256\\",\\"id\\":\\"84cf452c1e0375c3d4412cb550bd1783358468a3b3b777da4829d72c7d6fb74f\\",\\"index\\":\\"filebeat-7.12.0-2021.03.10-000001\\",\\"type\\":\\"file\\"}}"',
        },
        { line: 2, text: '  }' },
      ];

      before(() => {
        cleanKibana();
        esArchiverLoad('threat_indicator');
        esArchiverLoad('suspicious_source_event');
        loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
        goToManageAlertsDetectionRules();
        createCustomIndicatorRule(newThreatIndicatorRule);
        reload();
      });

      after(() => {
        esArchiverUnload('threat_indicator');
        esArchiverUnload('suspicious_source_event');
      });

      beforeEach(() => {
        loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
        goToManageAlertsDetectionRules();
        goToRuleDetails();
      });

      it('Displays matches on the timeline', () => {
        addsFieldsToTimeline(fieldSearch, fields);

        fields.forEach((field, index) => {
          cy.get(TIMELINE_FIELD(field)).should('have.text', expectedFieldsText[index]);
        });
      });

      it('Displays enrichment on the JSON view', () => {
        expandFirstAlert();
        openJsonView();
        scrollJsonViewToBottom();

        cy.get(JSON_LINES).then((elements) => {
          const length = elements.length;
          expectedEnrichment.forEach((enrichment) => {
            cy.wrap(elements)
              .eq(length - enrichment.line)
              .should('have.text', enrichment.text);
          });
        });
      });

      it('Displays threat summary data on alerts details', () => {
        const expectedThreatSummary = [
          { field: 'matched.field', value: 'myhash.mysha256' },
          { field: 'matched.type', value: 'file' },
          { field: 'first_seen', value: '2021-03-10T08:02:14.000Z' },
        ];

        expandFirstAlert();

        cy.get(THREAT_SUMMARY_VIEW).within(() => {
          cy.get(TABLE_ROWS).should('have.length', expectedThreatSummary.length);
          expectedThreatSummary.forEach((row, index) => {
            cy.get(TABLE_ROWS)
              .eq(index)
              .within(() => {
                cy.get(TITLE).should('have.text', row.field);
                cy.get(THREAT_CONTENT).should('have.text', row.value);
              });
          });
        });
      });

      it('Displays threat indicator data on the threat intel tab', () => {
        const expectedThreatIndicatorData = [
          { field: 'first_seen', value: '2021-03-10T08:02:14.000Z' },
          { field: 'file.size', value: '80280' },
          { field: 'file.type', value: 'elf' },
          {
            field: 'file.hash.sha256',
            value: 'a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3',
          },
          {
            field: 'file.hash.tlsh',
            value: '6D7312E017B517CC1371A8353BED205E9128223972AE35302E97528DF957703BAB2DBE',
          },
          {
            field: 'file.hash.ssdeep',
            value:
              '1536:87vbq1lGAXSEYQjbChaAU2yU23M51DjZgSQAvcYkFtZTjzBht5:8D+CAXFYQChaAUk5ljnQssL',
          },
          { field: 'file.hash.md5', value: '9b6c3518a91d23ed77504b5416bfb5b3' },
          { field: 'type', value: 'file' },
          {
            field: 'event.reference',
            value:
              'https://urlhaus-api.abuse.ch/v1/download/a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3/(opens in a new tab or window)',
          },
          { field: 'event.ingested', value: '2021-03-10T14:51:09.809069Z' },
          { field: 'event.created', value: '2021-03-10T14:51:07.663Z' },
          { field: 'event.kind', value: 'enrichment' },
          { field: 'event.module', value: 'threatintel' },
          { field: 'event.category', value: 'threat' },
          { field: 'event.type', value: 'indicator' },
          { field: 'event.dataset', value: 'threatintel.abusemalware' },
          {
            field: 'matched.atomic',
            value: 'a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3',
          },
          { field: 'matched.field', value: 'myhash.mysha256' },
          {
            field: 'matched.id',
            value: '84cf452c1e0375c3d4412cb550bd1783358468a3b3b777da4829d72c7d6fb74f',
          },
          { field: 'matched.index', value: 'filebeat-7.12.0-2021.03.10-000001' },
          { field: 'matched.type', value: 'file' },
        ];

        expandFirstAlert();
        openThreatIndicatorDetails();

        cy.get(THREAT_INTEL_TAB).should('have.text', 'Threat Intel (1)');
        cy.get(THREAT_DETAILS_VIEW).within(() => {
          cy.get(TABLE_ROWS).should('have.length', expectedThreatIndicatorData.length);
          expectedThreatIndicatorData.forEach((row, index) => {
            cy.get(TABLE_ROWS)
              .eq(index)
              .within(() => {
                cy.get(TABLE_CELL).eq(0).should('have.text', row.field);
                cy.get(TABLE_CELL).eq(1).should('have.text', row.value);
              });
          });
        });
      });
    });

    describe('Duplicates the indicator rule', () => {
      beforeEach(() => {
        cleanKibana();
        loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
        goToManageAlertsDetectionRules();
        createCustomIndicatorRule(newThreatIndicatorRule);
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
