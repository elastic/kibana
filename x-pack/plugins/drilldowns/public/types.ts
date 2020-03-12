/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AdvancedUiActionsActionFactoryDefinition as ActionFactoryDefinition } from '../../advanced_ui_actions/public';

export interface Drilldown<
  Config extends object = object,
  FactoryContext extends object = object,
  ExecutionContext extends object = object
>
  extends Pick<
    ActionFactoryDefinition<Config, FactoryContext, ExecutionContext>,
    'id' | 'createConfig' | 'CollectConfig' | 'isConfigValid' | 'getDisplayName'
  > {
  /**
   * List of places where this drilldown should be available, e.g "dashboard".
   * If omitted, the drilldown will be shown in all places.
   */
  places?: string[];

  /**
   * Name of EUI icon to display next to this drilldown.
   */
  euiIcon?: string;

  /**
   * Implements the "navigation" action when user clicks something in the UI and
   * instance of this drilldown is triggered.
   *
   * @param config Config object that user configured this drilldown with.
   * @param context Object that represents context in which the underlying
   *  `UIAction` of this drilldown is being executed in.
   */
  execute(config: Config, context: ExecutionContext): void;
}

export type AnyDrilldown = Drilldown<any, any, any>;
