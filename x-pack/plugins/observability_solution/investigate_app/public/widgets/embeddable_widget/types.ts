/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigateWidget, InvestigateWidgetCreate } from '@kbn/investigate-plugin/common';

export interface EmbeddableWidgetParameters {
  type: string;
  savedObjectId?: string;
  config: Record<string, any>;
}

export type EmbeddableWidgetCreate = InvestigateWidgetCreate<EmbeddableWidgetParameters>;

export type EmbeddableWidget = InvestigateWidget<EmbeddableWidgetParameters, {}>;
