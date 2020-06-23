/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Represents types of login form layouts.
 */
export type LoginLayout = 'form' | 'error-es-unavailable' | 'error-xpack-unavailable';

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
   * Indicates whether we allow users to access agreement UI and acknowledge it.
   */
  readonly allowAccessAgreement: boolean;

  /**
   * Indicates whether we allow logging of audit events.
   */
  readonly allowAuditLogging: boolean;

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
   * Indicates whether we allow sub-feature privileges.
   */
  readonly allowSubFeaturePrivileges: boolean;

  /**
   * Describes the layout of the login form if it's displayed.
   */
  readonly layout?: LoginLayout;
}
