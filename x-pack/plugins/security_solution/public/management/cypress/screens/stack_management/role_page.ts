/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadPage } from '../../tasks/common';

/**
 * Navigates to the Stack Management security role page. If `roleName` argument is passed,
 * then the edit page for that role is displayed. Otherwise the "create new" role form page
 * will be loaded.
 *
 * @param roleName
 */
export const navigateToRolePage = (roleName?: string): void => {
  return loadPage(`/app/management/security/roles/edit${roleName ? `/${roleName}` : ''}`);
};

/**
 * Ensure the role page is currently loaded
 */
export const ensureOnRolePage = (): Cypress.Chainable<JQuery<HTMLDivElement>> => {
  return cy.getByTestSubj<HTMLDivElement>('roleNameFormRow').should('exist');
};

/**
 * Opens the kibana privileges flyout from the role page
 */
export const openKibanaFeaturePrivilegesFlyout = (): Cypress.Chainable => {
  ensureOnRolePage();
  return cy.getByTestSubj('addSpacePrivilegeButton').click();
};

/**
 * Returns the Flyout DIV
 */
export const getKibanaFeaturePrivilegesFlyout = (): Cypress.Chainable => {
  return cy.getByTestSubj('createSpacePrivilegeButton').closest('.euiFlyout');
};

/**
 * Expands the "Security" (security solution) accordion on the Kibana privilesge flyout
 */
export const expandSecuritySolutionCategoryKibanaPrivileges = (): Cypress.Chainable => {
  return cy.getByTestSubj('featureCategoryButton_securitySolution').closest('button').click();
};

/**
 * Returns the area of the ui (`div`) that holds the security Solution set of kibana privileges.
 * This is the top-level accordion group in the flyout that is titled "Security" with the security
 * icon next to it.
 */
export const getSecuritySolutionCategoryKibanaPrivileges = (): Cypress.Chainable<
  JQuery<HTMLDivElement>
> => {
  return getKibanaFeaturePrivilegesFlyout().findByTestSubj<HTMLDivElement>(
    'featureCategory_securitySolution'
  );
};

/**
 * Expand the "security" grouping found inside of the top-level "Security" (security solution)
 * kibana feature privileges grouping. This is the area where Endpoint related RBAC is managed
 */
export const expandEndpointSecurityFeaturePrivileges = (): Cypress.Chainable => {
  return cy.get('.featurePrivilegeName:contains("Security")').closest('button').click();
};

export const getEndpointSecurityFeaturePrivileges = () => {
  return cy.get('.featurePrivilegeName:contains("Security")').closest('.euiAccordion');
};

/**
 * Set a space on the Kibana Privileges flyout
 * @param spaceId
 */
export const setKibanaPrivilegeSpace = (spaceId: string) => {
  getKibanaFeaturePrivilegesFlyout()
    .findByTestSubj('spaceSelectorComboBox')
    .findByTestSubj('comboBoxToggleListButton')
    .click();

  cy.getByTestSubj('comboBoxOptionsList spaceSelectorComboBox-optionsList')
    .find(`button#spaceOption_${spaceId}`)
    .click();
};

/**
 * Sets the privilege for the `security` grouping (inside of the security solution top-level flyout category)
 * @param privilege
 */
export const setSecuritySolutionEndpointGroupPrivilege = (
  privilege: 'all' | 'read' | 'none'
): Cypress.Chainable<JQuery<HTMLElement>> => {
  return getSecuritySolutionCategoryKibanaPrivileges().findByTestSubj(`siem_${privilege}`).click();
};

/**
 * Clicks the toggle that allows for user to customize the Endpoint related features (RBAC)
 */
export const clickEndpointSubFeaturePrivilegesCustomization = (): Cypress.Chainable<
  JQuery<HTMLElement>
> => {
  return getEndpointSecurityFeaturePrivileges()
    .findByTestSubj('customizeSubFeaturePrivileges')
    .click();
};

type EndpointSubFeatureNames =
  | 'endpoint_list'
  | 'trusted_applications'
  | 'host_isolation_exceptions'
  | 'blocklist'
  | 'event_filters'
  | 'policy_management'
  | 'actions_log_management'
  | 'host_isolation'
  | 'process_operations'
  | 'file_operations'
  | 'execute_operations'
  | 'scan_operations';

export const setEndpointSubFeaturePrivilege = (
  feature: EndpointSubFeatureNames,
  privilege: 'all' | 'read' | 'none'
): Cypress.Chainable<JQuery<HTMLElement>> => {
  if (privilege === 'none') {
    // `none` does not have a unique test subject inside of the Kibana privileges flyout. To get
    // around this, we first find the `All` option for the feature and then from there we can get its
    // associated `none` button
    getEndpointSecurityFeaturePrivileges()
      .findByTestSubj(`${feature}_all`)
      .parent()
      .findByTestSubj('none')
      .click();
  }

  return getEndpointSecurityFeaturePrivileges().findByTestSubj(`${feature}_${privilege}`).click();
};

/**
 * Clicks the "Create/Update space privilege" button on the kibana privileges flyout
 */
export const clickFlyoutAddKibanaPrivilegeButton = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  return getKibanaFeaturePrivilegesFlyout().findByTestSubj('createSpacePrivilegeButton').click();
};

/**
 * Clicks the Save/Update role button
 */
export const clickRoleSaveButton = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  ensureOnRolePage();
  return cy.getByTestSubj('roleFormSaveButton').click();
};

/**
 * Sets the name of the role on the form
 * @param roleName
 */
export const setRoleName = (roleName: string): void => {
  ensureOnRolePage();
  cy.getByTestSubj('roleFormNameInput').type(roleName);
};

export const clickViewPrivilegeSummaryButton = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  ensureOnRolePage();
  return cy.getByTestSubj('viewPrivilegeSummaryButton').click();
};
