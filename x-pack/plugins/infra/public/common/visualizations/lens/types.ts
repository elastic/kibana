/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { FormBasedLayer, XYState } from '@kbn/lens-plugin/public';

export interface ILensVisualization {
  getTitle(): string;
  getVisualizationType(): string;
  getLayers(): Record<string, Omit<FormBasedLayer, 'indexPatternId'>>;
  getVisualizationState(): XYState;
  getReferences(): SavedObjectReference[];
  getAdhocDataView(): Record<string, DataViewSpec>;
}
