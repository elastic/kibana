/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// -------------------------------------------------------------------------------------------------
// Installed package

/**
 * Basic information about an installed Fleet package.
 */
export interface InstalledPackageBasicInfo {
  /**
   * Name is a unique package id within a given cluster.
   * There can't be 2 or more different packages with the same name.
   * @example 'aws'
   */
  package_name: string;

  /**
   * Title is a user-friendly name of the package that we show in the UI.
   * @example 'AWS'
   */
  package_title: string;

  /**
   * Version of the package. Semver-compatible.
   * @example '1.2.3'
   */
  package_version: string;
}

/**
 * Information about an installed Fleet package including its integrations.
 *
 * @example
 * {
 *   package_name: 'aws',
 *   package_title: 'AWS',
 *   package_version: '1.16.1',
 *   integrations: [
 *     {
 *       integration_name: 'billing',
 *       integration_title: 'AWS Billing',
 *       is_enabled: false
 *     },
 *     {
 *       integration_name: 'cloudtrail',
 *       integration_title: 'AWS CloudTrail',
 *       is_enabled: false
 *     },
 *     {
 *       integration_name: 'cloudwatch',
 *       integration_title: 'AWS CloudWatch',
 *       is_enabled: false
 *     },
 *     {
 *       integration_name: 'cloudfront',
 *       integration_title: 'Amazon CloudFront',
 *       is_enabled: true
 *     }
 *   ]
 * }
 */
export interface InstalledPackage extends InstalledPackageBasicInfo {
  integrations: InstalledIntegrationBasicInfo[];
}

// -------------------------------------------------------------------------------------------------
// Installed integration

/**
 * Basic information about an installed Fleet integration.
 * An integration belongs to a package. A package can contain one or many integrations.
 */
export interface InstalledIntegrationBasicInfo {
  /**
   * Name identifies an integration within its package.
   * @example 'cloudtrail'
   */
  integration_name: string;

  /**
   * Title is a user-friendly name of the integration that we show in the UI.
   * @example 'AWS CloudTrail'
   */
  integration_title: string;

  /**
   * Whether this integration is enabled or not in at least one package policy in Fleet.
   */
  is_enabled: boolean;
}

/**
 * Information about an installed Fleet integration including info about its package.
 *
 * @example
 * {
 *   package_name: 'aws',
 *   package_title: 'AWS',
 *   package_version: '1.16.1',
 *   integration_name: 'cloudtrail',
 *   integration_title: 'AWS CloudTrail',
 *   is_enabled: false
 * }
 *
 * @example
 * {
 *   package_name: 'system',
 *   package_title: 'System',
 *   package_version: '1.13.0',
 *   is_enabled: true
 * }
 */
export interface InstalledIntegration extends InstalledPackageBasicInfo {
  /**
   * Name identifies an integration within its package.
   * Undefined when package name === integration name. This indicates that it's the only integration
   * within this package.
   * @example 'cloudtrail'
   * @example undefined
   */
  integration_name?: string;

  /**
   * Title is a user-friendly name of the integration that we show in the UI.
   * Undefined when package name === integration name. This indicates that it's the only integration
   * within this package.
   * @example 'AWS CloudTrail'
   * @example undefined
   */
  integration_title?: string;

  /**
   * Whether this integration is enabled or not in at least one package policy in Fleet.
   */
  is_enabled: boolean;
}

// -------------------------------------------------------------------------------------------------
// Arrays of installed packages and integrations

/**
 * An array of installed packages with their integrations.
 * This is a hierarchical way of representing installed integrations.
 *
 * @example
 * [
 *   {
 *     package_name: 'aws',
 *     package_title: 'AWS',
 *     package_version: '1.16.1',
 *     integrations: [
 *       {
 *         integration_name: 'billing',
 *         integration_title: 'AWS Billing',
 *         is_enabled: false
 *       },
 *       {
 *         integration_name: 'cloudtrail',
 *         integration_title: 'AWS CloudTrail',
 *         is_enabled: false
 *       },
 *       {
 *         integration_name: 'cloudwatch',
 *         integration_title: 'AWS CloudWatch',
 *         is_enabled: false
 *       },
 *       {
 *         integration_name: 'cloudfront',
 *         integration_title: 'Amazon CloudFront',
 *         is_enabled: true
 *       }
 *     ]
 *   },
 *   {
 *     package_name: 'system',
 *     package_title: 'System',
 *     package_version: '1.13.0',
 *     integrations: [
 *       {
 *         integration_name: 'system',
 *         integration_title: 'System logs and metrics',
 *         is_enabled: true
 *       }
 *     ]
 *   }
 * ]
 */
export type InstalledPackageArray = InstalledPackage[];

/**
 * An array of installed integrations with info about their packages.
 * This is a flattened way of representing installed integrations.
 *
 * @example
 * [
 *   {
 *     package_name: 'aws',
 *     package_title: 'AWS',
 *     package_version: '1.16.1',
 *     integration_name: 'billing',
 *     integration_title: 'AWS Billing',
 *     is_enabled: false
 *   },
 *   {
 *     package_name: 'aws',
 *     package_title: 'AWS',
 *     package_version: '1.16.1',
 *     integration_name: 'cloudtrail',
 *     integration_title: 'AWS CloudTrail',
 *     is_enabled: false
 *   },
 *   {
 *     package_name: 'aws',
 *     package_title: 'AWS',
 *     package_version: '1.16.1',
 *     integration_name: 'cloudwatch',
 *     integration_title: 'AWS CloudWatch',
 *     is_enabled: false
 *   },
 *   {
 *     package_name: 'aws',
 *     package_title: 'AWS',
 *     package_version: '1.16.1',
 *     integration_name: 'cloudfront',
 *     integration_title: 'Amazon CloudFront',
 *     is_enabled: true
 *   },
 *   {
 *     package_name: 'system',
 *     package_title: 'System',
 *     package_version: '1.13.0',
 *     is_enabled: true
 *   }
 * ]
 */
export type InstalledIntegrationArray = InstalledIntegration[];
