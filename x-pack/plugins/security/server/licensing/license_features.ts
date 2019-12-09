/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Describes Security plugin features that depend on license.
 */
export interface SecurityLicenseFeatures {
  /**
   * Indicates whether we show login page or skip it.
   */
  readonly showLogin: boolean;

  /**
   * Indicates whether we allow login or disable it on the login page.
   */
  readonly allowLogin: boolean;

  /**
   * Indicates whether we show security links throughout the kibana app.
   */
  readonly showLinks: boolean;

  /**
   * Indicates whether we show the Role Mappings UI.
   */
  readonly showRoleMappingsManagement: boolean;

  /**
   * Indicates whether we allow users to define document level security in roles.
   */
  readonly allowRoleDocumentLevelSecurity: boolean;

  /**
   * Indicates whether we allow users to define field level security in roles.
   */
  readonly allowRoleFieldLevelSecurity: boolean;

  /**
   * Indicates whether we allow Role-based access control (RBAC).
   */
  readonly allowRbac: boolean;

  /**
   * Describes the layout of the login form if it's displayed.
   */
  readonly layout?: string;

  /**
   * Message to show when security links are clicked throughout the kibana app.
   */
  readonly linksMessage?: string;
}
