/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionFactoryDefinition, BaseActionFactoryContext } from '../dynamic_actions';
import { LicenseType } from '../../../licensing/public';
import { TriggerContextMapping, TriggerId } from '../../../../../src/plugins/ui_actions/public';
import { ActionExecutionContext } from '../../../../../src/plugins/ui_actions/public';

/**
 * This is a convenience interface to register a drilldown. Drilldown has
 * ability to collect configuration from user. Once drilldown is executed it
 * receives the collected information together with the context of the
 * user's interaction.
 *
 * `Config` is a serializable object containing the configuration that the
 * drilldown is able to collect using UI.
 *
 * `ExecutionContext` is an object created in response to user's interaction
 * and provided to the `execute` function of the drilldown. This object contains
 * information about the action user performed.
 */

export interface DrilldownDefinition<
  Config extends object = object,
  SupportedTriggers extends TriggerId = TriggerId,
  FactoryContext extends BaseActionFactoryContext<SupportedTriggers> = {
    triggers: SupportedTriggers[];
  },
  ExecutionContext extends TriggerContextMapping[SupportedTriggers] = TriggerContextMapping[SupportedTriggers]
> {
  /**
   * Globally unique identifier for this drilldown.
   */
  id: string;

  /**
   * Minimal licence level
   * Empty means no restrictions
   */
  minimalLicense?: LicenseType;

  /**
   * Determines the display order of the drilldowns in the flyout picker.
   * Higher numbers are displayed first.
   */
  order?: number;

  /**
   * Function that returns default config for this drilldown.
   */
  createConfig: ActionFactoryDefinition<
    Config,
    SupportedTriggers,
    FactoryContext,
    ExecutionContext
  >['createConfig'];

  /**
   * `UiComponent` that collections config for this drilldown. You can create
   * a React component and transform it `UiComponent` using `uiToReactComponent`
   * helper from `kibana_utils` plugin.
   *
   * ```tsx
   * import React from 'react';
   * import { uiToReactComponent } from 'src/plugins/kibana_utils';
   * import { CollectConfigProps } from 'src/plugins/kibana_utils/public';
   *
   * type Props = CollectConfigProps<Config>;
   *
   * const ReactCollectConfig: React.FC<Props> = () => {
   *   return <div>Collecting config...'</div>;
   * };
   *
   * export const CollectConfig = uiToReactComponent(ReactCollectConfig);
   * ```
   */
  CollectConfig: ActionFactoryDefinition<
    Config,
    SupportedTriggers,
    FactoryContext,
    ExecutionContext
  >['CollectConfig'];

  /**
   * A validator function for the config object. Should always return a boolean
   * given any input.
   */
  isConfigValid: ActionFactoryDefinition<
    Config,
    SupportedTriggers,
    FactoryContext,
    ExecutionContext
  >['isConfigValid'];

  /**
   * Name of EUI icon to display when showing this drilldown to user.
   */
  euiIcon?: string;

  /**
   * Should return an internationalized name of the drilldown, which will be
   * displayed to the user.
   */
  getDisplayName: () => string;

  /**
   * isCompatible during execution
   * Could be used to prevent drilldown from execution
   */
  isCompatible?(
    config: Config,
    context: ExecutionContext | ActionExecutionContext<ExecutionContext>
  ): Promise<boolean>;

  /**
   * Implements the "navigation" action of the drilldown. This happens when
   * user clicks something in the UI that executes a trigger to which this
   * drilldown was attached.
   *
   * @param config Config object that user configured this drilldown with.
   * @param context Object that represents context in which the underlying
   *  `UIAction` of this drilldown is being executed in.
   */
  execute(
    config: Config,
    context: ExecutionContext | ActionExecutionContext<ExecutionContext>
  ): void;

  /**
   * A link where drilldown should navigate on middle click or Ctrl + click.
   */
  getHref?(
    config: Config,
    context: ExecutionContext | ActionExecutionContext<ExecutionContext>
  ): Promise<string | undefined>;

  /**
   * List of triggers supported by this drilldown type
   * This is used in trigger picker when configuring drilldown
   */
  supportedTriggers(): SupportedTriggers[];
}
