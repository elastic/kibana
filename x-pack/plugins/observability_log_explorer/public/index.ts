/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { ObservabilityLogExplorerConfig } from '../common/plugin_config';
import { ObservabilityLogExplorerPlugin } from './plugin';

export { SINGLE_DATASET_LOCATOR_ID, ALL_DATASETS_LOCATOR_ID } from '../common/locators/utils';
export type { AllDatasetsLocatorParams, SingleDatasetLocatorParams } from '../common/locators';

export function plugin(context: PluginInitializerContext<ObservabilityLogExplorerConfig>) {
  return new ObservabilityLogExplorerPlugin(context);
}
