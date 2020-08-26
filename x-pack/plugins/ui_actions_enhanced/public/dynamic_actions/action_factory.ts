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
import { BaseActionFactoryContext, SerializedAction } from './types';
import { ILicense } from '../../../licensing/public';
import { UiActionsActionDefinition as ActionDefinition } from '../../../../../src/plugins/ui_actions/public';

export class ActionFactory<
  Config extends object = object,
  SupportedTriggers extends TriggerId = TriggerId,
  FactoryContext extends BaseActionFactoryContext<SupportedTriggers> = {
    triggers: SupportedTriggers[];
  },
  ActionContext extends TriggerContextMapping[SupportedTriggers] = TriggerContextMapping[SupportedTriggers]
> implements Omit<Presentable<FactoryContext>, 'getHref'>, Configurable<Config, FactoryContext> {
  constructor(
    protected readonly def: ActionFactoryDefinition<
      Config,
      SupportedTriggers,
      FactoryContext,
      ActionContext
    >,
    protected readonly getLicence: () => ILicense
  ) {}

  public readonly id = this.def.id;
  public readonly minimalLicense = this.def.minimalLicense;
  public readonly order = this.def.order || 0;
  public readonly MenuItem? = this.def.MenuItem;
  public readonly ReactMenuItem? = this.MenuItem ? uiToReactComponent(this.MenuItem) : undefined;

  public readonly CollectConfig = this.def.CollectConfig;
  public readonly ReactCollectConfig = uiToReactComponent(this.CollectConfig);
  public readonly createConfig = this.def.createConfig;
  public readonly isConfigValid = this.def.isConfigValid;

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
   * Does this action factory licence requirements
   * compatible with current license?
   */
  public isCompatibleLicence() {
    if (!this.minimalLicense) return true;
    const licence = this.getLicence();
    return licence.isAvailable && licence.isActive && licence.hasAtLeast(this.minimalLicense);
  }

  public create(
    serializedAction: Omit<SerializedAction<Config>, 'factoryId'>
  ): ActionDefinition<ActionContext> {
    const action = this.def.create(serializedAction);
    return {
      ...action,
      isCompatible: async (context: ActionContext): Promise<boolean> => {
        if (!this.isCompatibleLicence()) return false;
        if (!action.isCompatible) return true;
        return action.isCompatible(context);
      },
    };
  }

  public supportedTriggers(): SupportedTriggers[] {
    return this.def.supportedTriggers();
  }
}
