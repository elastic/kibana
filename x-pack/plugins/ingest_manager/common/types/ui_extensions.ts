/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ComponentType, LazyExoticComponent } from 'react';
import { PackagePolicy } from './models';

/** Register a Fleet UI extension */
export type ExtensionRegistrationCallback = (extensionPoint: UIExtensionPoint) => void;

/** Internal storage for registered UI Extension Points */
export interface ExtensionsStorage {
  [key: string]: Partial<
    Record<
      UIExtensionPoint['type'],
      Partial<Record<UIExtensionPoint['view'], UIExtensionPoint['component']>>
    >
  >;
}

/**
 * UI Component Extension is used on the pages displaying the ability to edit an
 * Integration Policy
 */
export type IntegrationPolicyEditExtensionComponent = ComponentType<{
  /** The current integration policy being edited */
  currentPolicy: PackagePolicy;
  /**
   * A callback that should be executed anytime a change to the Integration Policy needs to
   * be reported back to the Fleet Policy Edit page
   */
  onChange: (opts: {
    /** is current form state is valid */
    isValid: boolean;
    /** The updated Integration Policy */
    updatedPolicy: PackagePolicy;
  }) => void;
}>;

/** Extension point registration contract for Integration Policy Edit views */
export interface IntegrationPolicyEditExtension {
  integration: string;
  type: 'integration-policy';
  view: 'edit';
  component: LazyExoticComponent<IntegrationPolicyEditExtensionComponent>;
}

/**
 * UI Component Extension is used to display a Custom tab (and view) under a given Integration
 */
export type IntegrationCustomExtensionComponent = ComponentType;

/** Extension point registration contract for Integration details Custom view */
export interface IntegrationCustomExtension {
  integration: string;
  type: 'integration';
  view: 'custom';
  component: LazyExoticComponent<IntegrationCustomExtensionComponent>;
}

/** Fleet UI Extension Point */
export type UIExtensionPoint = IntegrationPolicyEditExtension | IntegrationCustomExtension;
