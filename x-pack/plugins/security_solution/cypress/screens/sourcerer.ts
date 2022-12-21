/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SOURCERER = {
  alertCheckbox: '[data-test-subj="sourcerer-alert-only-checkbox"]',
  advancedSettings: '[data-test-subj="sourcerer-advanced-options-toggle"]',
  comboBoxInput: '[data-test-subj="sourcerer-combo-box"] [data-test-subj="comboBoxInput"]',
  comboBoxOptions: '[data-test-subj="sourcerer-combo-option"]',
  badgeModified: '[data-test-subj="sourcerer-modified-badge"]',
  badgeModifiedOption: '[data-test-subj="security-modified-option-badge"]',
  badgeAlerts: '[data-test-subj="sourcerer-alerts-badge"]',
  badgeAlertsOption: '[data-test-subj="security-alerts-option-badge"]',
  siemDefaultIndexInput:
    '[data-test-subj="advancedSetting-editField-securitySolution:defaultIndex"]',
  popoverTitle: '[data-test-subj="sourcerer-title"]',
  resetButton: 'button[data-test-subj="sourcerer-reset"]',
  saveButton: 'button[data-test-subj="sourcerer-save"]',
  selectActiveOption: 'button[data-test-subj="sourcerer-select"]',
  selectListOption: '.euiSuperSelect__item [data-test-subj="dataView-option-super"]',
  selectListDefaultOption: '.euiSuperSelect__item [data-test-subj="security-option-super"]',
  tooltip: '[data-test-subj="sourcerer-tooltip"]',
  triggerTimeline: '[data-test-subj="timeline-sourcerer-trigger"]',
  trigger: '[data-test-subj="sourcerer-trigger"]',
  wrapper: '[data-test-subj="sourcerer-popover"]',
  wrapperTimeline: '[data-test-subj="timeline-sourcerer-popover"]',
};

export const HOSTS_STAT = '[data-test-subj="stat-hosts"] [data-test-subj="stat-title"]';
