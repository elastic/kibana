/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiToReactComponent } from '../../../../../src/plugins/kibana_react/public';
import {
  UiActionsActionDefinition as ActionDefinition,
  UiActionsPresentable as Presentable,
} from '../../../../../src/plugins/ui_actions/public';
import { ActionFactoryDefinition } from './action_factory_definition';
import { Configurable } from '../../../../../src/plugins/kibana_utils/public';
import { SerializedAction } from './types';

export class ActionFactory<
  Config extends object = object,
  FactoryContext extends object = object,
  ActionContext extends object = object
> implements Omit<Presentable<FactoryContext>, 'getHref'>, Configurable<Config, FactoryContext> {
  constructor(
    protected readonly def: ActionFactoryDefinition<Config, FactoryContext, ActionContext>
  ) {}

  public readonly id = this.def.id;
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

  public create(
    serializedAction: Omit<SerializedAction<Config>, 'factoryId'>
  ): ActionDefinition<ActionContext> {
    return this.def.create(serializedAction);
  }
}
