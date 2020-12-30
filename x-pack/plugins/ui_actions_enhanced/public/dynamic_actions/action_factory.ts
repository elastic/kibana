/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiToReactComponent } from '../../../../../src/plugins/kibana_react/public';
import {
  TriggerContextMapping,
  TriggerId,
  UiActionsPresentable as Presentable,
} from '../../../../../src/plugins/ui_actions/public';
import { ActionFactoryDefinition } from './action_factory_definition';
import { Configurable } from '../../../../../src/plugins/kibana_utils/public';
import {
  BaseActionConfig,
  BaseActionFactoryContext,
  SerializedAction,
  SerializedEvent,
} from './types';
import { ILicense, LicensingPluginStart } from '../../../licensing/public';
import { UiActionsActionDefinition as ActionDefinition } from '../../../../../src/plugins/ui_actions/public';
import { SavedObjectReference } from '../../../../../src/core/types';
import { PersistableState } from '../../../../../src/plugins/kibana_utils/common';

export interface ActionFactoryDeps {
  readonly getLicense: () => ILicense;
  readonly getFeatureUsageStart: () => LicensingPluginStart['featureUsage'];
}

export class ActionFactory<
  Config extends BaseActionConfig = BaseActionConfig,
  SupportedTriggers extends TriggerId = TriggerId,
  FactoryContext extends BaseActionFactoryContext<SupportedTriggers> = {
    triggers: SupportedTriggers[];
  },
  ActionContext extends TriggerContextMapping[SupportedTriggers] = TriggerContextMapping[SupportedTriggers]
> implements
    Omit<Presentable<FactoryContext>, 'getHref'>,
    Configurable<Config, FactoryContext>,
    PersistableState<SerializedEvent> {
  constructor(
    protected readonly def: ActionFactoryDefinition<
      Config,
      SupportedTriggers,
      FactoryContext,
      ActionContext
    >,
    protected readonly deps: ActionFactoryDeps
  ) {
    if (def.minimalLicense && !def.licenseFeatureName) {
      throw new Error(
        `ActionFactory [actionFactory.id = ${def.id}] "licenseFeatureName" is required, if "minimalLicense" is provided`
      );
    }
  }

  public readonly id = this.def.id;
  public readonly isBeta = this.def.isBeta ?? false;
  public readonly minimalLicense = this.def.minimalLicense;
  public readonly licenseFeatureName = this.def.licenseFeatureName;
  public readonly order = this.def.order || 0;
  public readonly MenuItem? = this.def.MenuItem;
  public readonly ReactMenuItem? = this.MenuItem ? uiToReactComponent(this.MenuItem) : undefined;

  public readonly CollectConfig = this.def.CollectConfig;
  public readonly ReactCollectConfig = uiToReactComponent(this.CollectConfig);
  public readonly createConfig = this.def.createConfig;
  public readonly isConfigValid = this.def.isConfigValid;
  public readonly migrations = this.def.migrations || {};

  public getIconType(context: FactoryContext): string | undefined {
    if (!this.def.getIconType) return undefined;
    return this.def.getIconType(context);
  }

  public getDisplayName(context: FactoryContext): string {
    if (!this.def.getDisplayName) return '';
    return this.def.getDisplayName(context);
  }

  public getDisplayNameTooltip(context: FactoryContext): string {
    return '';
  }

  public async isCompatible(context: FactoryContext): Promise<boolean> {
    if (!this.def.isCompatible) return true;
    return await this.def.isCompatible(context);
  }

  /**
   * Does this action factory license requirements
   * compatible with current license?
   */
  public isCompatibleLicense() {
    if (!this.minimalLicense) return true;
    const license = this.deps.getLicense();
    return license.isAvailable && license.isActive && license.hasAtLeast(this.minimalLicense);
  }

  public create(
    serializedAction: Omit<SerializedAction<Config>, 'factoryId'>
  ): ActionDefinition<ActionContext> {
    const action = this.def.create(serializedAction);
    return {
      ...action,
      isCompatible: async (context: ActionContext): Promise<boolean> => {
        if (!this.isCompatibleLicense()) return false;
        if (!action.isCompatible) return true;
        return action.isCompatible(context);
      },
      execute: async (context: ActionContext): Promise<void> => {
        this.notifyFeatureUsage();
        return action.execute(context);
      },
    };
  }

  public supportedTriggers(): SupportedTriggers[] {
    return this.def.supportedTriggers();
  }

  private notifyFeatureUsage(): void {
    if (!this.minimalLicense || !this.licenseFeatureName) return;
    this.deps
      .getFeatureUsageStart()
      .notifyUsage(this.licenseFeatureName)
      .catch(() => {
        // eslint-disable-next-line no-console
        console.warn(
          `ActionFactory [actionFactory.id = ${this.def.id}] fail notify feature usage.`
        );
      });
  }

  public telemetry(state: SerializedEvent, telemetryData: Record<string, any>) {
    return this.def.telemetry ? this.def.telemetry(state, telemetryData) : {};
  }

  public extract(state: SerializedEvent) {
    return this.def.extract ? this.def.extract(state) : { state, references: [] };
  }

  public inject(state: SerializedEvent, references: SavedObjectReference[]) {
    return this.def.inject ? this.def.inject(state, references) : state;
  }
}
