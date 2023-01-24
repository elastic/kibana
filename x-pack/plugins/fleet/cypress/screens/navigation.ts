/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TOGGLE_NAVIGATION_BTN = 'toggleNavButton';
export const NAV_APP_LINK = 'collapsibleNavAppLink';
export const LOADING_SPINNER = '.euiLoadingSpinner';
export const TOAST_CLOSE_BTN = 'toastCloseButton';

// these selectors are part of a common component and so are used everywhere
export const CONFIRM_MODAL = {
  CONFIRM_BUTTON: 'confirmModalConfirmButton',
  CANCEL_BUTTON: 'confirmModalCancelButton',
};

export const CONFIRM_MODAL_BTN_SEL = `[data-test-subj=${CONFIRM_MODAL.CONFIRM_BUTTON}]`;
