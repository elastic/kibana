/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Configurable } from '@kbn/kibana-utils-plugin/public';
import { LicenseType } from '@kbn/licensing-plugin/public';
import {
  UiActionsActionDefinition as ActionDefinition,
  UiActionsPresentable as Presentable,
} from '@kbn/ui-actions-plugin/public';
import { PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';
import {
  BaseActionConfig,
  BaseActionFactoryContext,
  SerializedAction,
  SerializedEvent,
} from './types';

/**
 * This is a convenience interface for registering new action factories.
 */
export interface ActionFactoryDefinition<
  Config extends BaseActionConfig = BaseActionConfig,
  ExecutionContext extends object = object,
  FactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
> extends Partial<Omit<Presentable<FactoryContext>, 'getHref'>>,
    Configurable<Config, FactoryContext>,
    PersistableStateDefinition<SerializedEvent> {
  /**
   * Unique ID of the action factory. This ID is used to identify this action
   * factory in the registry as well as to construct actions of this type and
   * identify this action factory when presenting it to the user in UI.
   */
  id: string;

  /**
   * Minimal license level
   * Empty means no license restrictions
   */
  readonly minimalLicense?: LicenseType;

  /**
   * Required when `minimalLicense` is used.
   * Is a user-facing string. Has to be unique. Doesn't need i18n.
   * The feature's name will be displayed to Cloud end-users when they're billed based on their feature usage.
   */
  licenseFeatureName?: string;

  /**
   * Is this action factory not GA?
   * Adds a beta badge on a list item representing this ActionFactory
   */
  readonly isBeta?: boolean;

  /**
   * This method should return a definition of a new action, normally used to
   * register it in `ui_actions` registry.
   */
  create(
    serializedAction: Omit<SerializedAction<Config>, 'factoryId'>
  ): ActionDefinition<ExecutionContext>;

  supportedTriggers(): string[];
}
