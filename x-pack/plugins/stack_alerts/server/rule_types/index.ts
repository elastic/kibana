/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterRuleTypesParams } from './types';
import { register as registerIndexThreshold } from './index_threshold';
import { register as registerGeoContainment } from './geo_containment';
import { register as registerEsQuery } from './es_query';

export * from './constants';

export function registerBuiltInRuleTypes(params: RegisterRuleTypesParams) {
  registerIndexThreshold(params);
  registerGeoContainment(params);
  registerEsQuery(params);
}
