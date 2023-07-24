/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  LensAttributes,
  LensVisualizationState,
  Chart,
  VisualizationAttributesBuilder,
} from '../types';
import { DataViewCache } from './data_view_cache';
import { getAdhocDataView } from './utils';

export class LensAttributesBuilder<T extends Chart<LensVisualizationState>>
  implements VisualizationAttributesBuilder
{
  private dataViewCache: DataViewCache;
  constructor(private state: { visualization: T }) {
    this.dataViewCache = DataViewCache.getInstance();
  }

  build(): LensAttributes {
    const { visualization } = this.state;
    return {
      title: visualization.getTitle(),
      visualizationType: visualization.getVisualizationType(),
      references: visualization.getReferences(),
      state: {
        datasourceStates: {
          formBased: {
            layers: visualization.getLayers(),
          },
        },
        internalReferences: visualization.getReferences(),
        filters: [],
        query: { language: 'kuery', query: '' },
        visualization: visualization.getVisualizationState(),
        adHocDataViews: getAdhocDataView(this.dataViewCache.getSpec(visualization.getDataView())),
      },
    };
  }
}
