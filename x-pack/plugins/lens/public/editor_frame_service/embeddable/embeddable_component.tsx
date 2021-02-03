/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EmbeddableRenderer,
  EmbeddableStart,
} from '../../../../../../src/plugins/embeddable/public';
import type { LensByReferenceInput, LensByValueInput } from './embeddable';
import type { Document } from '../../persistence';
import type { IndexPatternPersistedState } from '../../indexpattern_datasource/types';
import type { XYState } from '../../xy_visualization/types';
import type { PieVisualizationState } from '../../pie_visualization/types';
import type { DatatableVisualizationState } from '../../datatable_visualization/visualization';
import type { State as MetricState } from '../../metric_visualization/types';

type LensAttributes<TVisType, TVisState> = Omit<
  Document,
  'savedObjectId' | 'type' | 'state' | 'visualizationType'
> & {
  visualizationType: TVisType;
  state: Omit<Document['state'], 'datasourceStates' | 'visualization'> & {
    datasourceStates: {
      indexpattern: IndexPatternPersistedState;
    };
    visualization: TVisState;
  };
};

/**
 * Type-safe variant of by value embeddable input for Lens.
 * This can be used to hardcode certain Lens chart configurations within another app.
 */
export type TypedLensByValueInput = Omit<LensByValueInput, 'attributes'> & {
  attributes:
    | LensAttributes<'lnsXY', XYState>
    | LensAttributes<'lnsPie', PieVisualizationState>
    | LensAttributes<'lnsDatatable', DatatableVisualizationState>
    | LensAttributes<'lnsMetric', MetricState>;
};

export type EmbeddableComponentProps = TypedLensByValueInput | LensByReferenceInput;

export function getEmbeddableComponent(embeddableStart: EmbeddableStart) {
  return (props: EmbeddableComponentProps) => {
    const factory = embeddableStart.getEmbeddableFactory('lens')!;
    return <EmbeddableRenderer factory={factory} input={props} />;
  };
}
