/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  LensAttributes,
  TVisualization,
  VisualizationAttributes,
  VisualizationAttributesBuilder,
} from '../types';
import { DataViewCache } from './data_view_cache';
import { getAdhocDataView } from './utils';

export class LensAttributesBuilder<T extends VisualizationAttributes<TVisualization>>
  implements VisualizationAttributesBuilder
{
  private dataViewCache: DataViewCache;
  constructor(private visualization: T) {
    this.dataViewCache = DataViewCache.getInstance();
  }

  build(): LensAttributes {
    return {
      title: this.visualization.getTitle(),
      visualizationType: this.visualization.getVisualizationType(),
      references: this.visualization.getReferences(),
      state: {
        datasourceStates: {
          formBased: {
            layers: this.visualization.getLayers(),
          },
        },
        internalReferences: this.visualization.getReferences(),
        filters: this.visualization.getFilters(),
        query: { language: 'kuery', query: '' },
        visualization: this.visualization.getVisualizationState(),
        adHocDataViews: getAdhocDataView(
          this.dataViewCache.getSpec(this.visualization.getDataView())
        ),
      },
    };
  }
}
