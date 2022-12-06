/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATE_PICKER_ABSOLUTE_INPUT = '[data-test-subj="superDatePickerAbsoluteDateInput"]';

export const DATE_PICKER_APPLY_BUTTON =
  '[data-test-subj="globalDatePicker"] button[data-test-subj="querySubmitButton"]';

export const DATE_PICKER_APPLY_BUTTON_TIMELINE =
  '[data-test-subj="timeline-date-picker-container"] button[data-test-subj="superDatePickerApplyTimeButton"]';

export const DATE_PICKER_ABSOLUTE_TAB = '[data-test-subj="superDatePickerAbsoluteTab"]';

export const DATE_PICKER_END_DATE_POPOVER_BUTTON =
  '[data-test-subj="globalDatePicker"] [data-test-subj="superDatePickerendDatePopoverButton"]';

export const DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE =
  '[data-test-subj="timeline-date-picker-container"] [data-test-subj="superDatePickerendDatePopoverButton"]';

export const DATE_PICKER_START_DATE_POPOVER_BUTTON =
  'div[data-test-subj="globalDatePicker"] button[data-test-subj="superDatePickerstartDatePopoverButton"]';

export const GLOBAL_FILTERS_CONTAINER = '[data-test-subj="globalDatePicker"]';

export const SHOW_DATES_BUTTON = '[data-test-subj="superDatePickerShowDatesButton"]';

export const DATE_PICKER_SHOW_DATE_POPOVER_BUTTON = `${GLOBAL_FILTERS_CONTAINER} ${SHOW_DATES_BUTTON}`;

export const DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE =
  '[data-test-subj="timeline-date-picker-container"] [data-test-subj="superDatePickerstartDatePopoverButton"]';
