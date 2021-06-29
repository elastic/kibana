/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, LazyExoticComponent } from 'react';

import type { NewPackagePolicy, PackageInfo, PackagePolicy } from './index';

/** Register a Fleet UI extension */
export type UIExtensionRegistrationCallback = (extensionPoint: UIExtensionPoint) => void;

/** Internal storage for registered UI Extension Points */
export interface UIExtensionsStorage {
  [key: string]: Partial<Record<UIExtensionPoint['view'], UIExtensionPoint>>;
}

/**
 * UI Component Extension is used on the pages displaying the ability to edit an
 * Integration Policy
 */
export type PackagePolicyEditExtensionComponent = ComponentType<PackagePolicyEditExtensionComponentProps>;

export interface PackagePolicyEditExtensionComponentProps {
  /** The current integration policy being edited */
  policy: PackagePolicy;
  /** The new (updated) integration policy that will be saved */
  newPolicy: NewPackagePolicy;
  /**
   * A callback that should be executed anytime a change to the Integration Policy needs to
   * be reported back to the Fleet Policy Edit page.
   *
   * **NOTE:**
   * this callback will be recreated everytime the policy data changes, thus logic around its
   * invocation should take that into consideration in order to avoid an endless loop.
   */
  onChange: (opts: {
    /** is current form state is valid */
    isValid: boolean;
    /** The updated Integration Policy to be merged back and included in the API call */
    updatedPolicy: Partial<NewPackagePolicy>;
  }) => void;
}

/** Extension point registration contract for Integration Policy Edit views */
export interface PackagePolicyEditExtension {
  package: string;
  view: 'package-policy-edit';
  component: LazyExoticComponent<PackagePolicyEditExtensionComponent>;
}

/**
 * UI Component Extension is used on the pages displaying the ability to Create an
 * Integration Policy
 */
export type PackagePolicyCreateExtensionComponent = ComponentType<PackagePolicyCreateExtensionComponentProps>;

export interface PackagePolicyCreateExtensionComponentProps {
  /** The integration policy being created */
  newPolicy: NewPackagePolicy;
  /**
   * A callback that should be executed anytime a change to the Integration Policy needs to
   * be reported back to the Fleet Policy Edit page
   */
  onChange: (opts: {
    /** is current form state is valid */
    isValid: boolean;
    /** The updated Integration Policy to be merged back and included in the API call */
    updatedPolicy: NewPackagePolicy;
  }) => void;
}

/** Extension point registration contract for Integration Policy Create views */
export interface PackagePolicyCreateExtension {
  package: string;
  view: 'package-policy-create';
  component: LazyExoticComponent<PackagePolicyCreateExtensionComponent>;
}

/**
 * UI Component Extension is used to display a Custom tab (and view) under a given Integration
 */
export type PackageCustomExtensionComponent = ComponentType<PackageCustomExtensionComponentProps>;

export interface PackageCustomExtensionComponentProps {
  /** The package key value that should be used used for URLs */
  pkgkey: string;
  packageInfo: PackageInfo;
}

/** Extension point registration contract for Integration details Custom view */
export interface PackageCustomExtension {
  package: string;
  view: 'package-detail-custom';
  component: LazyExoticComponent<PackageCustomExtensionComponent>;
}

/** Fleet UI Extension Point */
export type UIExtensionPoint =
  | PackagePolicyEditExtension
  | PackageCustomExtension
  | PackagePolicyCreateExtension;
