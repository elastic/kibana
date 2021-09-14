/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SOURCERER_TRIGGER = '[data-test-subj="sourcerer-trigger"]';
export const SOURCERER_INPUT =
  '[data-test-subj="indexPattern-switcher"] [data-test-subj="comboBoxInput"]';
export const SOURCERER_OPTIONS =
  '[data-test-subj="comboBoxOptionsList indexPattern-switcher-optionsList"]';
export const SOURCERER_SAVE_BUTTON = 'button[data-test-subj="add-index"]';
export const SOURCERER_RESET_BUTTON = 'button[data-test-subj="sourcerer-reset"]';
export const SOURCERER_POPOVER_TITLE = '.euiPopoverTitle';
export const HOSTS_STAT = '[data-test-subj="stat-hosts"] [data-test-subj="stat-title"]';

export const SOURCERER_TIMELINE = {
  trigger: '[data-test-subj="sourcerer-timeline-trigger"]',
  advancedSettings: '[data-test-subj="advanced-settings"]',
  sourcerer: '[data-test-subj="timeline-sourcerer"]',
  sourcererInput: '[data-test-subj="timeline-sourcerer"] [data-test-subj="comboBoxInput"]',
  sourcererOptions: '[data-test-subj="comboBoxOptionsList timeline-sourcerer-optionsList"]',
  radioRaw: '[data-test-subj="timeline-sourcerer-radio"] label.euiRadio__label[for="raw"]',
  radioAlert: '[data-test-subj="timeline-sourcerer-radio"] label.euiRadio__label[for="alert"]',
  radioAll: '[data-test-subj="timeline-sourcerer-radio"] label.euiRadio__label[for="all"]',
  radioCustom: '[data-test-subj="timeline-sourcerer-radio"] input.euiRadio__input[id="custom"]',
  radioCustomLabel:
    '[data-test-subj="timeline-sourcerer-radio"] label.euiRadio__label[for="custom"]',
};
export const SOURCERER_TIMELINE_ADVANCED = '[data-test-subj="advanced-settings"]';
