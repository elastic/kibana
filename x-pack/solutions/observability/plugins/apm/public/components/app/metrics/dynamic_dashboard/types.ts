/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApiState } from '@kbn/lens-embeddable-utils/config_builder/schema';

export interface PanelDefinition {
  id: string;
  title: string;
  config: LensApiState;
  gridConfig: { x: number; y: number; w: number; h: number };
  requiredMetrics?: string[];
}

export type PanelBuilder = (indexPattern: string) => PanelDefinition[];
