/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyActionFactoryDefinition } from './action_factory_definition';
import { ActionFactory, AnyActionFactory } from './action_factory';

type ActionFactoryRegistry = Map<string, AnyActionFactory>;

export interface ActionFactoryServiceParams {
  actionFactories?: ActionFactoryRegistry;
}

export class ActionFactoryService {
  protected readonly actionFactories: ActionFactoryRegistry;

  constructor({ actionFactories = new Map() }: ActionFactoryServiceParams = {}) {
    this.actionFactories = actionFactories;
  }

  /**
   * Register a new action factory in global registry.
   */
  public readonly register = (definition: AnyActionFactoryDefinition) => {
    if (this.actionFactories.has(definition.id)) {
      throw new Error(`ActionFactory [actionFactory.id = ${definition.id}] already registered.`);
    }

    const actionFactory = new ActionFactory(definition);

    this.actionFactories.set(actionFactory.id, actionFactory);
  };

  /**
   * Returns an array of all action factories.
   */
  public readonly getAll = (): AnyActionFactory[] => {
    return [...this.actionFactories.values()];
  };

  public readonly clear = () => {
    this.actionFactories.clear();
  };
}
