/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigSchema, MlFeatures } from '../constants/app';

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
