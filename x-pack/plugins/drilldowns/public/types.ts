/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AdvancedUiActionsActionFactoryDefinition as ActionFactoryDefinition } from '../../advanced_ui_actions/public';

export interface Drilldown<
  Config extends object = object,
  CreationContext extends object = object,
  ExecutionContext extends object = object
> {
  /**
   * Globally unique identifier for this drilldown.
   */
  id: string;

  /**
   * List of places where this drilldown should be available, e.g "dashboard", "graph".
   * If omitted, the drilldown will be shown in all places.
   */
  places?: string[];

  /**
   * Function that returns default config for this drilldown.
   */
  createConfig: ActionFactoryDefinition<
    Config,
    DrilldownFactoryContext<CreationContext>,
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
   * import { UiActionsCollectConfigProps as CollectConfigProps } from 'src/plugins/ui_actions/public';
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
    DrilldownFactoryContext<CreationContext>,
    ExecutionContext
  >['CollectConfig'];

  /**
   * A validator function for the config object. Should always return a boolean
   * given any input.
   */
  isConfigValid: ActionFactoryDefinition<
    Config,
    DrilldownFactoryContext<CreationContext>,
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
   * Whether this drilldown should be considered for execution given `config`
   * and `context`. When multiple drilldowns are attached to the same trigger
   * user is presented with a context menu to pick one drilldown for execute. If
   * this method returns `true` this trigger will appear in the context menu
   * list, if `false`, it will not be presented to the user. If `doExecute` is
   * not implemented, this drilldown will always be show to the user.
   *
   * @param config Config object that user configured this drilldown with.
   * @param context Object that represents context in which the underlying
   *  `UIAction` of this drilldown is being executed in.
   */
  doExecute?(config: Config, context: ExecutionContext): Promise<boolean>;

  /**
   * Implements the "navigation" action of the drilldown. This happens when
   * user clicks something in the UI that executes a trigger to which this
   * drilldown was attached.
   *
   * @param config Config object that user configured this drilldown with.
   * @param context Object that represents context in which the underlying
   *  `UIAction` of this drilldown is being executed in.
   */
  execute(config: Config, context: ExecutionContext): void;
}

/**
 * Context object used when creating a drilldown.
 */
export interface DrilldownFactoryContext<T> {
  /**
   * List of places as configured in @type {Drilldown} interface.
   */
  places?: string[];

  /**
   * Context provided to the drilldown factory by the place where the UI is
   * rendered. For example, for the "dashboard" place, this context contains
   * the ID of the current dashboard, which could be used for filtering it out
   * of the list.
   */
  placeContext: T;

  /**
   * List of triggers that user selected in the UI.
   */
  triggers: string[];
}
