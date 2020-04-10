/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionFactoryRegistry } from '../types';
import { ActionFactory, ActionFactoryDefinition } from '../dynamic_actions';

export interface UiActionsServiceEnhancementsParams {
  readonly actionFactories?: ActionFactoryRegistry;
}

export class UiActionsServiceEnhancements {
  protected readonly actionFactories: ActionFactoryRegistry;

  constructor({ actionFactories = new Map() }: UiActionsServiceEnhancementsParams = {}) {
    this.actionFactories = actionFactories;
  }

  /**
   * Register an action factory. Action factories are used to configure and
   * serialize/deserialize dynamic actions.
   */
  public readonly registerActionFactory = <
    Config extends object = object,
    FactoryContext extends object = object,
    ActionContext extends object = object
  >(
    definition: ActionFactoryDefinition<Config, FactoryContext, ActionContext>
  ) => {
    if (this.actionFactories.has(definition.id)) {
      throw new Error(`ActionFactory [actionFactory.id = ${definition.id}] already registered.`);
    }

    const actionFactory = new ActionFactory<Config, FactoryContext, ActionContext>(definition);

    this.actionFactories.set(actionFactory.id, actionFactory as ActionFactory<any, any, any>);
  };

  public readonly getActionFactory = (actionFactoryId: string): ActionFactory => {
    const actionFactory = this.actionFactories.get(actionFactoryId);

    if (!actionFactory) {
      throw new Error(`Action factory [actionFactoryId = ${actionFactoryId}] does not exist.`);
    }

    return actionFactory;
  };

  /**
   * Returns an array of all action factories.
   */
  public readonly getActionFactories = (): ActionFactory[] => {
    return [...this.actionFactories.values()];
  };
}
