/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN_ID = 'ml';
export const PLUGIN_ICON = 'machineLearningApp';
export const PLUGIN_ICON_SOLUTION = 'logoKibana';
export const ML_APP_NAME = i18n.translate('xpack.ml.navMenu.mlAppNameText', {
  defaultMessage: 'Machine Learning',
});
export const ML_APP_ROUTE = '/app/ml';
export const ML_INTERNAL_BASE_PATH = '/internal/ml';
export const ML_EXTERNAL_BASE_PATH = '/api/ml';

export type MlFeatures = Record<'ad' | 'dfa' | 'nlp', boolean>;
export type CompatibleModule = 'security' | 'observability' | 'search';

export interface ConfigSchema {
  ad?: { enabled: boolean };
  dfa?: { enabled: boolean };
  nlp?: { enabled: boolean };
  compatibleModuleType?: CompatibleModule;
}

export function initEnabledFeatures(enabledFeatures: MlFeatures, config: ConfigSchema) {
  if (config.ad?.enabled !== undefined) {
    enabledFeatures.ad = config.ad.enabled;
  }
  if (config.dfa?.enabled !== undefined) {
    enabledFeatures.dfa = config.dfa.enabled;
  }
  if (config.nlp?.enabled !== undefined) {
    enabledFeatures.nlp = config.nlp.enabled;
  }
}
