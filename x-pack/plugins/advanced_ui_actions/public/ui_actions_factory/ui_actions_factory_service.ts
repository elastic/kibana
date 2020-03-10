/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Presentable,
  PresentableBaseContext,
  Configurable,
  ConfigurableBaseConfig,
} from '../../../../../src/plugins/ui_actions/public';

export type ActionBaseConfig = ConfigurableBaseConfig;
export type ActionFactoryBaseContext = PresentableBaseContext;
export interface ActionFactory<
  ActionConfig extends ActionBaseConfig = ActionBaseConfig,
  ActionFactoryContext extends ActionFactoryBaseContext = ActionFactoryBaseContext
> extends Presentable<ActionFactoryContext>, Configurable<ActionConfig> {}

export type ActionFactoryList = Array<ActionFactory<any, any>>;

type ActionFactoryRegistry = Map<string, ActionFactory<any, any>>;

export class UiActionsFactoryService {
  protected readonly actionFactories: ActionFactoryRegistry;

  constructor({ actionFactories = new Map() }: { actionFactories?: ActionFactoryRegistry } = {}) {
    this.actionFactories = actionFactories;
  }

  public readonly register = (actionFactory: ActionFactory) => {
    if (this.actionFactories.has(actionFactory.id)) {
      throw new Error(`ActionFactory [actionFactory.id = ${actionFactory.id}] already registered.`);
    }

    this.actionFactories.set(actionFactory.id, actionFactory);
  };

  public readonly getAll = (): Array<ActionFactory<any, any>> => {
    return Array.from(this.actionFactories.values());
  };

  public readonly clear = () => {
    this.actionFactories.clear();
  };
}
