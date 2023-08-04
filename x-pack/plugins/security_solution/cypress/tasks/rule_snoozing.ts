/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { RULE_NAME, TOASTER } from '../screens/alerts_detection_rules';
import {
  SNOOZED_BADGE,
  SNOOZE_POPOVER_APPLY_BUTTON,
  SNOOZE_POPOVER_CANCEL_BUTTON,
  SNOOZE_POPOVER_INTERVAL_UNIT_INPUT,
  SNOOZE_POPOVER_INTERVAL_VALUE_INPUT,
  UNSNOOZED_BADGE,
} from '../screens/rule_snoozing';

type SnoozeUnits = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
type SnoozeDuration = `${number} ${SnoozeUnits}`;

interface SnoozeParams {
  duration: SnoozeDuration;
}

interface TableRule {
  tableSelector: string;
  ruleName: string;
}

type SnoozeInTableParams = TableRule & SnoozeParams;

export function snoozeRule(duration: SnoozeDuration): void {
  openSnoozePopover();
  snoozeRuleInOpenPopover(duration);
}

export function expectSnoozeSuccessToast(): void {
  cy.get(TOASTER).should('contain', 'Rule successfully snoozed');
}

export function expectSnoozeErrorToast(): void {
  cy.get(TOASTER).should('contain', 'Unable to change rule snooze settings');
}

export function expectRuleSnoozed(duration: SnoozeDuration): void {
  cy.get(SNOOZED_BADGE).contains(expectedSnoozeBadgeText(duration));
}

export function snoozeRuleInTable({
  tableSelector,
  ruleName,
  duration,
}: SnoozeInTableParams): void {
  openSnoozePopoverInTable(tableSelector, ruleName);
  snoozeRuleInOpenPopover(duration);
}

export function expectRuleSnoozedInTable({
  tableSelector,
  ruleName,
  duration,
}: SnoozeInTableParams): void {
  findRuleRowInTable(tableSelector, ruleName)
    .find(SNOOZED_BADGE)
    .contains(expectedSnoozeBadgeText(duration));
}

export function unsnoozeRule(): void {
  cy.get(SNOOZED_BADGE).click();
  cy.get(SNOOZE_POPOVER_CANCEL_BUTTON).click();
}

export function expectUnsnoozeSuccessToast(): void {
  cy.get(TOASTER).should('contain', 'Rule successfully unsnoozed');
}

export function expectRuleUnsnoozed(): void {
  cy.get(UNSNOOZED_BADGE);
}

export function unsnoozeRuleInTable({ tableSelector, ruleName }: TableRule): void {
  findRuleRowInTable(tableSelector, ruleName).find(SNOOZED_BADGE).click();
  cy.get(SNOOZE_POPOVER_CANCEL_BUTTON).click();
}

export function expectRuleUnsnoozedInTable({ tableSelector, ruleName }: TableRule): void {
  findRuleRowInTable(tableSelector, ruleName).find(UNSNOOZED_BADGE).should('exist');
}

export function findRuleRowInTable(
  tableSelector: string,
  ruleName: string
): Cypress.Chainable<JQuery<HTMLTableRowElement>> {
  return cy.get(tableSelector).find(RULE_NAME).contains(ruleName).parents('tr');
}

/**
 * Opens a snooze popover by clicking the snooze badge. Fits to pages with one snooze icon per page.
 */
function openSnoozePopover(): void {
  cy.get(UNSNOOZED_BADGE).click();
}

/**
 * Opens a snooze popover by clicking the snooze badge in the table's row
 */
function openSnoozePopoverInTable(tableSelector: string, ruleName: string): void {
  const parent = findRuleRowInTable(tableSelector, ruleName);

  parent.find(UNSNOOZED_BADGE).click();
}

/**
 * Snoozes a rule in an open snooze popover
 */
function snoozeRuleInOpenPopover(duration: SnoozeDuration): void {
  const [value, units] = duration.split(' ');

  cy.log(`Snooze a rule for ${value} ${units}`);

  cy.get(SNOOZE_POPOVER_INTERVAL_VALUE_INPUT).clear();
  cy.get(SNOOZE_POPOVER_INTERVAL_VALUE_INPUT).type(value.toString());
  cy.get(SNOOZE_POPOVER_INTERVAL_UNIT_INPUT).select(units);
  cy.get(SNOOZE_POPOVER_APPLY_BUTTON).click();
}

function expectedSnoozeBadgeText(duration: SnoozeDuration): string {
  return moment()
    .add(...duration.split(' '))
    .format('MMM D');
}
