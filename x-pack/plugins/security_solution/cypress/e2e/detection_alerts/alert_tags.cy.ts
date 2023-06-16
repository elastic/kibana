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
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { MIXED_ALERT_TAG, SELECTED_ALERT_TAG, UNSELECTED_ALERT_TAG } from '../../screens/alerts';
import { esArchiverLoad, esArchiverResetKibana, esArchiverUnload } from '../../tasks/es_archiver';

describe('Alert tagging', () => {
  before(() => {
    cleanKibana();
    esArchiverResetKibana();
  });

  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    esArchiverLoad('endpoint');
    createRule(getNewRule({ rule_id: 'new custom rule' }));
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  after(() => {
    esArchiverUnload('endpoint');
  });

  it('Add a tag using the alert context menu', () => {
    openAlertTaggingContextMenu();
    clickAlertTag('Duplicate');
    updateAlertTags();
    waitForAlertsToPopulate();
    openAlertTaggingContextMenu();
    cy.get(SELECTED_ALERT_TAG).contains('Duplicate');
  });

  it('Remove a tag using the alert context menu', () => {
    openAlertTaggingContextMenu();
    clickAlertTag('Duplicate');
    updateAlertTags();
    waitForAlertsToPopulate();
    openAlertTaggingContextMenu();
    cy.get(UNSELECTED_ALERT_TAG).first().contains('Duplicate');
  });

  it('Add a tag using the alert bulk action menu', () => {
    selectNumberOfAlerts(1);
    openAlertTaggingBulkActionMenu();
    clickAlertTag('Duplicate');
    updateAlertTags();
    waitForAlertsToPopulate();
    selectNumberOfAlerts(1);
    openAlertTaggingBulkActionMenu();
    cy.get(SELECTED_ALERT_TAG).contains('Duplicate');
  });

  it('Add a tag using the alert bulk action menu with mixed state', () => {
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

  it('Remove a tag using the alert bulk action menu', () => {
    selectNumberOfAlerts(1);
    openAlertTaggingBulkActionMenu();
    clickAlertTag('Duplicate');
    updateAlertTags();
    waitForAlertsToPopulate();
    selectNumberOfAlerts(1);
    openAlertTaggingBulkActionMenu();
    cy.get(UNSELECTED_ALERT_TAG).first().contains('Duplicate');
  });

  it('Remove a tag using the alert bulk action menu with mixed state', () => {
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
