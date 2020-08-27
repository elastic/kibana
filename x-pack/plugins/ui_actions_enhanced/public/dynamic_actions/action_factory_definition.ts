/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Configurable } from '../../../../../src/plugins/kibana_utils/public';
import { BaseActionFactoryContext, SerializedAction } from './types';
import { LicenseType } from '../../../licensing/public';
import {
  TriggerContextMapping,
  TriggerId,
  UiActionsActionDefinition as ActionDefinition,
  UiActionsPresentable as Presentable,
} from '../../../../../src/plugins/ui_actions/public';

/**
 * This is a convenience interface for registering new action factories.
 */
export interface ActionFactoryDefinition<
  Config extends object = object,
  SupportedTriggers extends TriggerId = TriggerId,
  FactoryContext extends BaseActionFactoryContext<SupportedTriggers> = {
    triggers: SupportedTriggers[];
  },
  ActionContext extends TriggerContextMapping[SupportedTriggers] = TriggerContextMapping[SupportedTriggers]
> extends Partial<Omit<Presentable<FactoryContext>, 'getHref'>>,
    Configurable<Config, FactoryContext> {
  /**
   * Unique ID of the action factory. This ID is used to identify this action
   * factory in the registry as well as to construct actions of this type and
   * identify this action factory when presenting it to the user in UI.
   */
  id: string;

  /**
   * Minimal licence level
   * Empty means no licence restrictions
   */
  readonly minimalLicense?: LicenseType;

  /**
   * This method should return a definition of a new action, normally used to
   * register it in `ui_actions` registry.
   */
  create(
    serializedAction: Omit<SerializedAction<Config>, 'factoryId'>
  ): ActionDefinition<ActionContext>;

  supportedTriggers(): SupportedTriggers[];
}
