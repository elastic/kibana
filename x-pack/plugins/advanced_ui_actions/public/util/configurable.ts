/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiComponent } from 'src/plugins/kibana_utils/common';

export type ConfigurableBaseConfig = object;

/**
 * Represents something that can be configured by user using UI.
 */
export interface Configurable<Config extends ConfigurableBaseConfig = ConfigurableBaseConfig> {
  /**
   * Create default config for this item, used when item is created for the first time.
   */
  readonly createConfig: () => Config;

  /**
   * Is this config valid. Used to validate user's input before saving
   */
  readonly isConfigValid: (config: Config) => boolean;

  /**
   * `UiComponent` to be rendered when collecting configuration for this item.
   */
  readonly CollectConfig: UiComponent<CollectConfigProps<Config>>;
}

/**
 * Props provided to `CollectConfig` component on every re-render.
 */
export interface CollectConfigProps<
  Config extends ConfigurableBaseConfig = ConfigurableBaseConfig
> {
  /**
   * Current (latest) config of the item.
   */
  config: Config;

  /**
   * Callback called when user updates the config in UI.
   */
  onConfig: (config: Config) => void;
}
