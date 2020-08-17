/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionFactoryRegistry } from '../types';
import { ActionFactory, ActionFactoryDefinition } from '../dynamic_actions';
import { DrilldownDefinition } from '../drilldowns';
import { ILicense } from '../../../licensing/common/types';

export interface UiActionsServiceEnhancementsParams {
  readonly actionFactories?: ActionFactoryRegistry;
  readonly getLicenseInfo: () => ILicense;
}

export class UiActionsServiceEnhancements {
  protected readonly actionFactories: ActionFactoryRegistry;
  protected readonly getLicenseInfo: () => ILicense;

  constructor({ actionFactories = new Map(), getLicenseInfo }: UiActionsServiceEnhancementsParams) {
    this.actionFactories = actionFactories;
    this.getLicenseInfo = getLicenseInfo;
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

    const actionFactory = new ActionFactory<Config, FactoryContext, ActionContext>(
      definition,
      this.getLicenseInfo
    );

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

  /**
   * Convenience method to register a {@link DrilldownDefinition | drilldown}.
   */
  public readonly registerDrilldown = <
    Config extends object = object,
    ExecutionContext extends object = object
  >({
    id: factoryId,
    order,
    CollectConfig,
    createConfig,
    isConfigValid,
    getDisplayName,
    euiIcon,
    execute,
    getHref,
    minimalLicense,
  }: DrilldownDefinition<Config, ExecutionContext>): void => {
    const actionFactory: ActionFactoryDefinition<Config, object, ExecutionContext> = {
      id: factoryId,
      minimalLicense,
      order,
      CollectConfig,
      createConfig,
      isConfigValid,
      getDisplayName,
      getIconType: () => euiIcon,
      isCompatible: async () => true,
      create: (serializedAction) => ({
        id: '',
        type: factoryId,
        getIconType: () => euiIcon,
        getDisplayName: () => serializedAction.name,
        execute: async (context) => await execute(serializedAction.config, context),
        getHref: getHref ? async (context) => getHref(serializedAction.config, context) : undefined,
      }),
    } as ActionFactoryDefinition<Config, object, ExecutionContext>;

    this.registerActionFactory(actionFactory);
  };
}
