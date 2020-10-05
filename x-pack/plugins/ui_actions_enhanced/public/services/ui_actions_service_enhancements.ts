/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionFactoryRegistry } from '../types';
import {
  ActionFactory,
  ActionFactoryDefinition,
  BaseActionConfig,
  BaseActionFactoryContext,
  SerializedEvent,
} from '../dynamic_actions';
import { DrilldownDefinition } from '../drilldowns';
import { ILicense } from '../../../licensing/common/types';
import { TriggerContextMapping, TriggerId } from '../../../../../src/plugins/ui_actions/public';
import { LicensingPluginSetup, LicensingPluginStart } from '../../../licensing/public';
import { SavedObjectReference } from '../../../../../src/core/types';
import { PersistableStateDefinition } from '../../../../../src/plugins/kibana_utils/common';

import { DynamicActionsState } from '../../common/types';

export { DynamicActionsState };

export interface UiActionsServiceEnhancementsParams {
  readonly actionFactories?: ActionFactoryRegistry;
  readonly getLicense: () => ILicense;
  readonly featureUsageSetup: LicensingPluginSetup['featureUsage'];
  readonly getFeatureUsageStart: () => LicensingPluginStart['featureUsage'];
}

export class UiActionsServiceEnhancements
  implements PersistableStateDefinition<DynamicActionsState> {
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
    SupportedTriggers extends TriggerId = TriggerId,
    FactoryContext extends BaseActionFactoryContext<SupportedTriggers> = {
      triggers: SupportedTriggers[];
    },
    ActionContext extends TriggerContextMapping[SupportedTriggers] = TriggerContextMapping[SupportedTriggers]
  >(
    definition: ActionFactoryDefinition<Config, SupportedTriggers, FactoryContext, ActionContext>
  ) => {
    if (this.actionFactories.has(definition.id)) {
      throw new Error(`ActionFactory [actionFactory.id = ${definition.id}] already registered.`);
    }

    const actionFactory = new ActionFactory<
      Config,
      SupportedTriggers,
      FactoryContext,
      ActionContext
    >(definition, this.deps);

    this.actionFactories.set(actionFactory.id, actionFactory as ActionFactory<any, any, any>);
    this.registerFeatureUsage(definition);
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
    SupportedTriggers extends TriggerId = TriggerId,
    FactoryContext extends BaseActionFactoryContext<SupportedTriggers> = {
      triggers: SupportedTriggers[];
    },
    ExecutionContext extends TriggerContextMapping[SupportedTriggers] = TriggerContextMapping[SupportedTriggers]
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
  }: DrilldownDefinition<Config, SupportedTriggers, FactoryContext, ExecutionContext>): void => {
    const actionFactory: ActionFactoryDefinition<
      Config,
      SupportedTriggers,
      FactoryContext,
      ExecutionContext
    > = {
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
    } as ActionFactoryDefinition<Config, SupportedTriggers, FactoryContext, ExecutionContext>;

    this.registerActionFactory(actionFactory);
  };

  private registerFeatureUsage = (definition: ActionFactoryDefinition<any, any, any>): void => {
    if (!definition.minimalLicense || !definition.licenseFeatureName) return;
    this.deps.featureUsageSetup.register(definition.licenseFeatureName, definition.minimalLicense);
  };

  public readonly telemetry = (state: DynamicActionsState, telemetry: Record<string, any> = {}) => {
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
