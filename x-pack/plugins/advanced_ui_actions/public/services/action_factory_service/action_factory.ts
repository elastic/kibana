/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiToReactComponent } from '../../../../../../src/plugins/kibana_react/public';
import {
  UiActionsPresentable,
  UiActionsActionDefinition,
} from '../../../../../../src/plugins/ui_actions/public';
import {
  AnyActionFactoryDefinition,
  AFDConfig,
  AFDFactoryContext,
  AFDActionContext,
} from './action_factory_definition';
import { Configurable } from '../../util';

export class ActionFactory<D extends AnyActionFactoryDefinition>
  implements UiActionsPresentable<AFDFactoryContext<D>>, Configurable<AFDConfig<D>> {
  constructor(public readonly definition: D) {}

  public readonly id = this.definition.id;
  public readonly order = this.definition.order || 0;
  public readonly MenuItem? = this.definition.MenuItem;
  public readonly ReactMenuItem? = this.MenuItem ? uiToReactComponent(this.MenuItem) : undefined;

  public readonly CollectConfig = this.definition.CollectConfig;
  public readonly ReactCollectConfig = uiToReactComponent(this.CollectConfig);
  public readonly createConfig = this.definition.createConfig;
  public readonly isConfigValid = this.definition.isConfigValid;

  public getIconType(context: AFDFactoryContext<D>): string | undefined {
    if (!this.definition.getIconType) return undefined;
    return this.definition.getIconType(context);
  }

  public getDisplayName(context: AFDFactoryContext<D>): string {
    if (!this.definition.getDisplayName) return '';
    return this.definition.getDisplayName(context);
  }

  public async isCompatible(context: AFDFactoryContext<D>): Promise<boolean> {
    if (!this.definition.isCompatible) return true;
    return await this.definition.isCompatible(context);
  }

  public getHref(context: AFDFactoryContext<D>): string | undefined {
    if (!this.definition.getHref) return undefined;
    return this.definition.getHref(context);
  }

  public create(): UiActionsActionDefinition<AFDActionContext<D>> {
    throw new Error('not implemented');
  }
}

export type AnyActionFactory = ActionFactory<any>;
