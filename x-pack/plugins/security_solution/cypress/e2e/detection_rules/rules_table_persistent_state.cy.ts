import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillDefineCustomRuleAndContinue,
  fillScheduleRuleAndContinue,
} from '../../tasks/create_new_rule';
import {
  RULE_CREATION,
  DETECTIONS_RULE_MANAGEMENT_URL,
  DASHBOARDS_URL,
} from '../../urls/navigation';
import { getSimpleCustomQueryRule } from '../../objects/rule';
import {
  expectNumberOfRules,
  expectToContainRule,
  filterBySearchTerm,
  goBackFromRuleDetails,
  goToRuleDetails,
} from '../../tasks/alerts_detection_rules';
import { RULE_SEARCH_FIELD } from '../../screens/alerts_detection_rules';

function createRule(name: string, tags?: string[]): void {
  const rule = getSimpleCustomQueryRule();

  rule.name = name;
  rule.tags = tags;

  visit(RULE_CREATION);
  fillDefineCustomRuleAndContinue(rule);
  fillAboutRuleAndContinue(rule);
  fillScheduleRuleAndContinue(rule);
  createAndEnableRule();
}

describe('Persistent rules table state', () => {
  before(() => {
    cleanKibana();
    login();

    createRule('Test rule 1');
    createRule('Test rule 2', ['Custom']);
  });

  it('preserved after navigation from the rules details page', () => {
    visit(DETECTIONS_RULE_MANAGEMENT_URL);
    filterBySearchTerm('rule 1');

    expectNumberOfRules(1);
    expectToContainRule('rule 1');

    goToRuleDetails();
    goBackFromRuleDetails();

    cy.get(RULE_SEARCH_FIELD).should('have.value', 'rule 1');
    expectNumberOfRules(1);
    expectToContainRule('rule 1');
  });

  it('preserved after navigation from another page', () => {
    visit(DETECTIONS_RULE_MANAGEMENT_URL);
    filterBySearchTerm('rule 1');

    visit(DASHBOARDS_URL);
    cy.wait(300);
    visit(DETECTIONS_RULE_MANAGEMENT_URL);

    cy.get(RULE_SEARCH_FIELD).should('have.value', 'rule 1');
    expectNumberOfRules(1);
    expectToContainRule('rule 1');
  });
});
