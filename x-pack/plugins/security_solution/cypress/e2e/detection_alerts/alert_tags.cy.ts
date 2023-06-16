/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import {
  clickAlertTag,
  openAlertTaggingBulkActionMenu,
  openAlertTaggingContextMenu,
  selectNumberOfAlerts,
  updateAlertTags,
} from '../../tasks/alerts';
import { createRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { MIXED_ALERT_TAG, SELECTED_ALERT_TAG, UNSELECTED_ALERT_TAG } from '../../screens/alerts';

describe('Alert tagging', () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    createRule(getNewRule({ rule_id: 'new custom rule' }));
    visit(ALERTS_URL);
  });

  it('Add a tag using the alert context menu', function () {
    openAlertTaggingContextMenu();
    clickAlertTag('Duplicate');
    updateAlertTags();
    waitForAlertsToPopulate();
    openAlertTaggingContextMenu();
    cy.get(SELECTED_ALERT_TAG).contains('Duplicate');
  });

  it('Remove a tag using the alert context menu', function () {
    openAlertTaggingContextMenu();
    clickAlertTag('Duplicate');
    updateAlertTags();
    waitForAlertsToPopulate();
    openAlertTaggingContextMenu();
    cy.get(UNSELECTED_ALERT_TAG).first().contains('Duplicate');
  });

  it('Add a tag using the alert bulk action menu', function () {
    selectNumberOfAlerts(1);
    openAlertTaggingBulkActionMenu();
    clickAlertTag('Duplicate');
    updateAlertTags();
    waitForAlertsToPopulate();
    selectNumberOfAlerts(1);
    openAlertTaggingBulkActionMenu();
    cy.get(SELECTED_ALERT_TAG).contains('Duplicate');
  });

  it('Add a tag using the alert bulk action menu with mixed state', function () {
    selectNumberOfAlerts(2);
    openAlertTaggingBulkActionMenu();
    cy.get(MIXED_ALERT_TAG).contains('Duplicate');
    clickAlertTag('Duplicate');
    updateAlertTags();
    waitForAlertsToPopulate();
    selectNumberOfAlerts(2);
    openAlertTaggingBulkActionMenu();
    cy.get(SELECTED_ALERT_TAG).contains('Duplicate');
  });

  it('Remove a tag using the alert bulk action menu', function () {
    selectNumberOfAlerts(1);
    openAlertTaggingBulkActionMenu();
    clickAlertTag('Duplicate');
    updateAlertTags();
    waitForAlertsToPopulate();
    selectNumberOfAlerts(1);
    openAlertTaggingBulkActionMenu();
    cy.get(UNSELECTED_ALERT_TAG).first().contains('Duplicate');
  });

  it('Remove a tag using the alert bulk action menu with mixed state', function () {
    selectNumberOfAlerts(2);
    openAlertTaggingBulkActionMenu();
    cy.get(MIXED_ALERT_TAG).contains('Duplicate');
    clickAlertTag('Duplicate');
    clickAlertTag('Duplicate'); // Clicking twice will return to unselected state
    updateAlertTags();
    waitForAlertsToPopulate();
    selectNumberOfAlerts(2);
    openAlertTaggingBulkActionMenu();
    cy.get(UNSELECTED_ALERT_TAG).first().contains('Duplicate');
  });
});
