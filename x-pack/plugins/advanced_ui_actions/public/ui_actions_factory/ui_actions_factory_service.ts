/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Presentable,
  Configurable,
  ConfigurableBaseConfig,
} from '../../../../../src/plugins/ui_actions/public';

export type ActionBaseConfig = ConfigurableBaseConfig;
export interface ActionFactory<ActionConfig extends ActionBaseConfig = ActionBaseConfig>
  extends Presentable,
    Configurable<ActionConfig> {}

type ActionFactoryRegistry = Map<string, ActionFactory<any>>;

export class UiActionsFactoryService {
  protected readonly actionFactories: ActionFactoryRegistry;

  constructor({ actionFactories = new Map() }: { actionFactories?: ActionFactoryRegistry } = {}) {
    this.actionFactories = actionFactories;
  }

  public readonly register = (actionFactory: ActionFactory<any>) => {
    if (this.actionFactories.has(actionFactory.id)) {
      throw new Error(`ActionFactory [actionFactory.id = ${actionFactory.id}] already registered.`);
    }

    this.actionFactories.set(actionFactory.id, actionFactory);
  };

  public readonly getAll = (): Array<ActionFactory<any>> => {
    return Array.from(this.actionFactories.values());
  };

  public readonly clear = () => {
    this.actionFactories.clear();
  };
}
