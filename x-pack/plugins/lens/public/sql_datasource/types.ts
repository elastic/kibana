/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';

export interface EsSQLLayerColumn {
  columnId: string;
  fieldName: string;
  meta?: DatatableColumn['meta'];
  customLabel?: string;
}

export interface TextBasedLanguageField {
  id: string;
  field: string;
}

export interface EsSQLLayer {
  index: string;
  query: AggregateQuery | undefined;
  columns: EsSQLLayerColumn[];
  allColumns: EsSQLLayerColumn[];
  timeField?: string;
}

export interface EsSQLPersistedState {
  layers: Record<string, EsSQLLayer>;
}

export type EsSQLPrivateState = EsSQLPersistedState & {
  indexPatternRefs: IndexPatternRef[];
  autoMap?: boolean;
  // cachedFieldList: Record<string, { fields: DatatableColumn[]; singleRow: boolean }>;
  fieldList: DatatableColumn[];
  removedLayers: Array<{
    layer: EsSQLLayer;
    fieldList: DatatableColumn[];
  }>;
};

export interface IndexPatternRef {
  id: string;
  title: string;
  timeField?: string;
}
