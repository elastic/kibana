/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DETECTION_PAGE_FILTER_GROUP_CONTEXT_MENU,
  DETECTION_PAGE_FILTER_GROUP_RESET_BUTTON,
  FILTER_GROUP_ADD_CONTROL,
  FILTER_GROUP_CONTEXT_EDIT_CONTROLS,
  FILTER_GROUP_EDIT_CONTROLS_PANEL,
  FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS,
  FILTER_GROUP_SAVE_CHANGES,
  CONTROL_FRAME_TITLE,
  FILTER_GROUP_CONTROL_ACTION_DELETE,
  FILTER_GROUP_CONTROL_CONFIRM_DIALOG,
  FILTER_GROUP_CONTROL_CONFIRM_BTN,
  DETECTION_PAGE_FILTER_GROUP_WRAPPER,
  DETECTION_PAGE_FILTER_GROUP_LOADING,
  DETECTION_PAGE_FILTERS_LOADING,
  OPTION_LISTS_LOADING,
  FILTER_GROUP_CONTEXT_DISCARD_CHANGES,
  FILTER_GROUP_CONTROL_ACTION_EDIT,
} from '../../screens/common/filter_group';
import { waitForPageFilters } from '../alerts';

export const openFilterGroupContextMenu = () => {
  cy.get(DETECTION_PAGE_FILTER_GROUP_CONTEXT_MENU).click({ force: true });
};

export const waitForFilterGroups = () => {
  cy.log('Waiting for Page Filters');
  // since these are only valid on the alert page
  cy.get(DETECTION_PAGE_FILTER_GROUP_WRAPPER).should('exist');
  cy.get(DETECTION_PAGE_FILTER_GROUP_LOADING).should('not.exist');
  cy.get(DETECTION_PAGE_FILTERS_LOADING).should('not.exist');
  cy.get(OPTION_LISTS_LOADING).should('have.lengthOf', 0);
};

export const resetFilterGroup = () => {
  openFilterGroupContextMenu();
  cy.get(DETECTION_PAGE_FILTER_GROUP_RESET_BUTTON).click({ force: true });
};

export const editFilterGroupControls = () => {
  openFilterGroupContextMenu();
  cy.get(FILTER_GROUP_CONTEXT_EDIT_CONTROLS).trigger('click');
};

export const cancelFieldEditing = () => {
  cy.get(FILTER_GROUP_EDIT_CONTROLS_PANEL).should('be.visible');
  cy.get(FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS.CANCEL).should('be.visible').trigger('click');
  cy.get(FILTER_GROUP_EDIT_CONTROLS_PANEL).should('not.exist');
};

export const saveFilterGroupControls = () => {
  cy.get(FILTER_GROUP_SAVE_CHANGES).trigger('click');
  cy.get(FILTER_GROUP_SAVE_CHANGES).should('not.exist');
  waitForPageFilters();
};

export const discardFilterGroupControls = () => {
  openFilterGroupContextMenu();
  cy.get(FILTER_GROUP_CONTEXT_DISCARD_CHANGES).trigger('click', { force: true });
};

export const openAddFilterGroupControlPanel = () => {
  cy.get(FILTER_GROUP_ADD_CONTROL).trigger('click');
  cy.get(FILTER_GROUP_EDIT_CONTROLS_PANEL).should('be.visible');
};

export const addNewFilterGroupControlValues = ({
  fieldName,
  label,
}: {
  fieldName: string;
  label: string;
}) => {
  const { FIELD_SEARCH, FIELD_PICKER, FIELD_LABEL, SAVE } = FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS;
  openAddFilterGroupControlPanel();
  cy.get(FIELD_SEARCH).type(fieldName);
  cy.get(FIELD_PICKER(fieldName)).should('exist').trigger('click');

  cy.get(FIELD_LABEL).should('have.value', fieldName);
  cy.get(FIELD_LABEL).clear();
  cy.get(FIELD_LABEL).type(label).should('have.value', label);
  cy.get(SAVE).trigger('click');
  cy.get(FILTER_GROUP_EDIT_CONTROLS_PANEL).should('not.exist');
  waitForPageFilters();
};

export const deleteFilterGroupControl = (idx: number) => {
  cy.get(CONTROL_FRAME_TITLE).eq(idx).trigger('mouseover');
  cy.get(FILTER_GROUP_CONTROL_ACTION_DELETE(idx)).trigger('click', { force: true });
  cy.get(FILTER_GROUP_CONTROL_CONFIRM_DIALOG).should('be.visible');
  cy.get(FILTER_GROUP_CONTROL_CONFIRM_BTN).trigger('click');
};

export const editFilterGroupControl = ({
  idx,
  fieldName,
  label,
}: {
  idx: number;
  fieldName: string;
  label: string;
}) => {
  cy.get(CONTROL_FRAME_TITLE).eq(idx).trigger('mouseover');
  cy.get(FILTER_GROUP_CONTROL_ACTION_EDIT(idx)).trigger('click', { force: true });
  const { FIELD_SEARCH, FIELD_PICKER, FIELD_LABEL, SAVE } = FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS;
  cy.get(FIELD_SEARCH).type(fieldName);
  cy.get(FIELD_PICKER(fieldName)).should('exist').trigger('click');

  cy.get(FIELD_LABEL).should('have.value', fieldName);
  cy.get(FIELD_LABEL).clear();
  cy.get(FIELD_LABEL).type(label).should('have.value', label);
  cy.get(SAVE).trigger('click');
  cy.get(FILTER_GROUP_EDIT_CONTROLS_PANEL).should('not.exist');
};
