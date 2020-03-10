/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UiActionsPresentable,
  UiActionsActionDefinition,
} from '../../../../../../src/plugins/ui_actions/public';
import { Configurable } from '../../util';

/**
 * This is a convenience interface for registering new action factories.
 */
export interface ActionFactoryDefinition<
  Config extends object = object,
  FactoryContext extends object = object,
  ActionContext extends object = object
> extends Partial<UiActionsPresentable<FactoryContext>>, Configurable<Config> {
  /**
   * Unique ID of the action factory. This ID is used to identify this action
   * factory in the registry as well as to construct actions of this ID and
   * identify this action factory when presenting it to the user in UI.
   */
  id: string;

  /**
   * This method should return a definition of a new action, normally used to
   * register it in `ui_actions` registry.
   */
  create(): UiActionsActionDefinition<ActionContext>;
}

export type AnyActionFactoryDefinition = ActionFactoryDefinition<any, any, any>;

export type AFDConfig<T> = T extends ActionFactoryDefinition<infer Config, any, any>
  ? Config
  : never;

export type AFDFactoryContext<T> = T extends ActionFactoryDefinition<any, infer FactoryContext, any>
  ? FactoryContext
  : never;

export type AFDActionContext<T> = T extends ActionFactoryDefinition<any, any, infer ActionContext>
  ? ActionContext
  : never;
