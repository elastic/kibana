/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { ILicense } from '@kbn/licensing-plugin/common/types';
import { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { SavedObjectReference } from '@kbn/core/types';
import { PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';
import { DrilldownDefinition } from '../drilldowns';
import {
  ActionFactory,
  ActionFactoryDefinition,
  BaseActionConfig,
  BaseActionFactoryContext,
  SerializedEvent,
} from '../dynamic_actions';
import { ActionFactoryRegistry } from '../types';

import { DynamicActionsState } from '../../common/types';

export type { DynamicActionsState };

export interface UiActionsServiceEnhancementsParams {
  readonly actionFactories?: ActionFactoryRegistry;
  readonly getLicense: () => ILicense;
  readonly featureUsageSetup: LicensingPluginSetup['featureUsage'];
  readonly getFeatureUsageStart: () => LicensingPluginStart['featureUsage'];
}

export class UiActionsServiceEnhancements
  implements PersistableStateDefinition<DynamicActionsState>
{
  protected readonly actionFactories: ActionFactoryRegistry;
  protected readonly deps: Omit<UiActionsServiceEnhancementsParams, 'actionFactories'>;

  constructor({ actionFactories = new Map(), ...deps }: UiActionsServiceEnhancementsParams) {
    this.actionFactories = actionFactories;
    this.deps = deps;
  }

  /**
   * Register an action factory. Action factories are used to configure and
   * serialize/deserialize dynamic actions.
   */
  public readonly registerActionFactory = <
    Config extends BaseActionConfig = BaseActionConfig,
    ExecutionContext extends object = object,
    FactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
  >(
    definition: ActionFactoryDefinition<Config, ExecutionContext, FactoryContext>
  ) => {
    if (this.actionFactories.has(definition.id)) {
      throw new Error(`ActionFactory [actionFactory.id = ${definition.id}] already registered.`);
    }

    const actionFactory = new ActionFactory<Config, ExecutionContext, FactoryContext>(
      definition,
      this.deps
    );

    this.actionFactories.set(
      actionFactory.id,
      actionFactory as unknown as ActionFactory<
        SerializableRecord,
        ExecutionContext,
        BaseActionFactoryContext
      >
    );
    this.registerFeatureUsage(definition as unknown as ActionFactoryDefinition);
  };

  public readonly getActionFactory = (actionFactoryId: string): ActionFactory => {
    const actionFactory = this.actionFactories.get(actionFactoryId);

    if (!actionFactory) {
      throw new Error(`Action factory [actionFactoryId = ${actionFactoryId}] does not exist.`);
    }

    return actionFactory;
  };

  public readonly hasActionFactory = (actionFactoryId: string): boolean => {
    return this.actionFactories.has(actionFactoryId);
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
    Config extends BaseActionConfig = BaseActionConfig,
    ExecutionContext extends object = object,
    FactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
  >({
    id: factoryId,
    isBeta,
    order,
    CollectConfig,
    createConfig,
    isConfigValid,
    getDisplayName,
    euiIcon,
    execute,
    getHref,
    minimalLicense,
    licenseFeatureName,
    supportedTriggers,
    isCompatible,
    telemetry,
    extract,
    inject,
  }: DrilldownDefinition<Config, ExecutionContext, FactoryContext>): void => {
    const actionFactory: ActionFactoryDefinition<Config, ExecutionContext, FactoryContext> = {
      id: factoryId,
      isBeta,
      minimalLicense,
      licenseFeatureName,
      order,
      CollectConfig,
      createConfig,
      isConfigValid,
      getDisplayName,
      supportedTriggers,
      telemetry,
      extract,
      inject,
      getIconType: () => euiIcon,
      isCompatible: async () => true,
      create: (serializedAction) => ({
        id: '',
        type: factoryId,
        getIconType: () => euiIcon,
        getDisplayName: () => serializedAction.name,
        execute: async (context) => await execute(serializedAction.config, context),
        getHref: getHref ? async (context) => getHref(serializedAction.config, context) : undefined,
        isCompatible: isCompatible
          ? async (context) => isCompatible(serializedAction.config, context)
          : undefined,
      }),
    } as ActionFactoryDefinition<Config, ExecutionContext, FactoryContext>;

    this.registerActionFactory(actionFactory);
  };

  private registerFeatureUsage = (definition: ActionFactoryDefinition): void => {
    if (!definition.minimalLicense || !definition.licenseFeatureName) return;
    this.deps.featureUsageSetup.register(definition.licenseFeatureName, definition.minimalLicense);
  };

  public readonly telemetry = (
    state: DynamicActionsState,
    telemetry: Record<string, string | number | boolean> = {}
  ) => {
    let telemetryData = telemetry;
    state.events.forEach((event: SerializedEvent) => {
      if (this.actionFactories.has(event.action.factoryId)) {
        telemetryData = this.actionFactories
          .get(event.action.factoryId)!
          .telemetry(event, telemetryData);
      }
    });
    return telemetryData;
  };

  public readonly extract = (state: DynamicActionsState) => {
    const references: SavedObjectReference[] = [];
    const newState = {
      events: state.events.map((event: SerializedEvent) => {
        const result = this.actionFactories.has(event.action.factoryId)
          ? this.actionFactories.get(event.action.factoryId)!.extract(event)
          : {
              state: event,
              references: [],
            };
        references.push(...result.references);
        return result.state;
      }),
    };
    return { state: newState, references };
  };

  public readonly inject = (state: DynamicActionsState, references: SavedObjectReference[]) => {
    return {
      events: state.events.map((event: SerializedEvent) => {
        return this.actionFactories.has(event.action.factoryId)
          ? this.actionFactories.get(event.action.factoryId)!.inject(event, references)
          : event;
      }),
    };
  };
}
