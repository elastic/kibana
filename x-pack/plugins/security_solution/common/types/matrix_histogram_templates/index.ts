/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  XYState,
  PieVisualizationState,
  DatatableVisualizationState,
  MetricState,
} from '../../../../lens/public';

export interface MatrixHistogramTemplateReference {
  id: string;
  name: string;
  type: string;
}

export interface MatrixHistogramTemplateAttribute<TVisType, TVisState> {
  description: string;
  state: TVisState;
  title: string;
  visualizationType: TVisType;
  references: MatrixHistogramTemplateReference[];
}

export type MatrixHistogramTemplateAttributes =
  | MatrixHistogramTemplateAttribute<'lnsXY', XYState>
  | MatrixHistogramTemplateAttribute<'lnsPie', PieVisualizationState>
  | MatrixHistogramTemplateAttribute<'lnsDatatable', DatatableVisualizationState>
  | MatrixHistogramTemplateAttribute<'lnsMetric', MetricState>;

export interface MatrixHistogramTemplate {
  id: string;
  attributes: MatrixHistogramTemplateAttributes;
}

export interface MatrixHistogramTemplateSavedObject {
  attributes: MatrixHistogramTemplateAttributes;
  coreMigrationVersion: string;
  id: string;
  migrationVersion: string;
  namespaces: string[];
  references: MatrixHistogramTemplateReference[];
  score: number | null;
  sort: number[];
  type: string;
  updated_at: string;
  version: string;
}

export interface TemplateFindResponse {
  templates: MatrixHistogramTemplateSavedObject[];
}
