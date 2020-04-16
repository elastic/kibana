/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AdvancedUiActionsActionFactoryDefinition as ActionFactoryDefinition } from '../../advanced_ui_actions/public';

/**
 * This is a convenience interface to register a drilldown. Drilldown has
 * ability to collect configuration from user. Once drilldown is executed it
 * receives the collected information together with the context of the
 * user's interaction.
 *
 * `Config` is a serializable object containing the configuration that the
 * drilldown is able to collect using UI.
 *
 * `PlaceContext` is an object that the app that opens drilldown management
 * flyout provides to the React component, specifying the contextual information
 * about that app. For example, on Dashboard app this context contains
 * information about the current embeddable and dashboard.
 *
 * `ExecutionContext` is an object created in response to user's interaction
 * and provided to the `execute` function of the drilldown. This object contains
 * information about the action user performed.
 */
export interface DrilldownDefinition<
  Config extends object = object,
  PlaceContext extends object = object,
  ExecutionContext extends object = object
> {
  /**
   * Globally unique identifier for this drilldown.
   */
  id: string;

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
    DrilldownFactoryContext<PlaceContext>,
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
    DrilldownFactoryContext<PlaceContext>,
    ExecutionContext
  >['CollectConfig'];

  /**
   * A validator function for the config object. Should always return a boolean
   * given any input.
   */
  isConfigValid: ActionFactoryDefinition<
    Config,
    DrilldownFactoryContext<PlaceContext>,
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
   * Implements the "navigation" action of the drilldown. This happens when
   * user clicks something in the UI that executes a trigger to which this
   * drilldown was attached.
   *
   * @param config Config object that user configured this drilldown with.
   * @param context Object that represents context in which the underlying
   *  `UIAction` of this drilldown is being executed in.
   */
  execute(config: Config, context: ExecutionContext): void;

  /**
   * A link where drilldown should navigate on middle click or Ctrl + click.
   */
  getHref?(config: Config, context: ExecutionContext): string | undefined;
}

/**
 * Context object used when creating a drilldown.
 */
export interface DrilldownFactoryContext<T> {
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
