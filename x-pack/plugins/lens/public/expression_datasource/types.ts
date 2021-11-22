/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ExpressionBasedLayer {
  index: string;
  query: string;
  columns: Array<{ columnId: string; fieldName: string }>;
  timeField?: string;
  overwrittenFieldTypes?: Record<string, string>;
}

export interface ExpressionBasedPersistedState {
  layers: Record<string, ExpressionBasedLayer>;
}

export type ExpressionBasedPrivateState = ExpressionBasedPersistedState & {
  indexPatternRefs: IndexPatternRef[];
  autoMap?: boolean;
  cachedFieldList: Record<
    string,
    { fields: Array<{ name: string; type: string }>; singleRow: boolean }
  >;
  removedLayers: Array<{
    layer: ExpressionBasedLayer;
    fieldList: { fields: Array<{ name: string; type: string }>; singleRow: boolean };
  }>;
};

export interface IndexPatternRef {
  id: string;
  title: string;
}
