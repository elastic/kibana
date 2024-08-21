/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterWidget } from '@kbn/investigate-plugin/public/types';
import type { InvestigateAppServices } from '../services/types';
import type { InvestigateAppSetupDependencies, InvestigateAppStartDependencies } from '../types';
import { registerEmbeddableWidget } from './embeddable_widget/register_embeddable_widget';
import { registerEsqlWidget } from './esql_widget/register_esql_widget';

export interface RegisterWidgetOptions {
  dependencies: {
    setup: InvestigateAppSetupDependencies;
    start: InvestigateAppStartDependencies;
  };
  services: InvestigateAppServices;
  registerWidget: RegisterWidget;
}

export function registerWidgets(options: RegisterWidgetOptions) {
  registerEsqlWidget(options);
  registerEmbeddableWidget(options);
}
