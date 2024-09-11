/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigateAppServices } from '../services/types';
import type { InvestigateAppSetupDependencies, InvestigateAppStartDependencies } from '../types';
import { registerEmbeddableItem } from './embeddable_item/register_embeddable_item';
import { registerEsqlItem } from './esql_item/register_esql_item';

export interface Options {
  dependencies: {
    setup: InvestigateAppSetupDependencies;
    start: InvestigateAppStartDependencies;
  };
  services: InvestigateAppServices;
}

export function registerItems(options: Options) {
  registerEsqlItem(options);
  registerEmbeddableItem(options);
}
