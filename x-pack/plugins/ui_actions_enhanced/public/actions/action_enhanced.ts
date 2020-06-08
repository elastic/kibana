/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Action,
  ActionType,
  UiActionsActionDefinition as ActionDefinition,
} from '../../../../../src/plugins/ui_actions/public';
import { LicenseType } from '../../../licensing/public';

export interface ActionEnhanced<Context extends {} = {}, T = ActionType>
  extends Action<Context, T> {
  /**
   * Minimal license
   * if missing, then no license limitations
   */
  readonly minimalLicense?: LicenseType;

  /**
   * Does this action meet current licence?
   */
  isCompatibleLicence(): boolean;
}

export interface ActionEnhancedDefinition<Context extends object = object>
  extends ActionDefinition<Context> {
  /**
   * Minimal license
   * if missing, then no license limitations
   */
  readonly minimalLicense?: LicenseType;
}

export type ActionEnhancedContext<A> = A extends ActionEnhancedDefinition<infer Context>
  ? Context
  : never;
