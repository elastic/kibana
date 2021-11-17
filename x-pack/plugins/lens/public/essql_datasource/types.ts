/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EsSQLLayer {
  index: string;
  query: string;
  columns: Array<{ columnId: string; fieldName: string }>;
  timeField?: string;
  overwrittenFieldTypes?: Record<string, string>;
}

export interface EsSQLPersistedState {
  layers: Record<string, EsSQLLayer>;
}

export type EsSQLPrivateState = EsSQLPersistedState & {
  indexPatternRefs: IndexPatternRef[];
  cachedFieldList: Record<
    string,
    { fields: Array<{ name: string; type: string }>; singleRow: boolean }
  >;
  removedLayers: Array<{
    layer: EsSQLLayer;
    fieldList: { fields: Array<{ name: string; type: string }>; singleRow: boolean };
  }>;
};

export interface IndexPatternRef {
  id: string;
  title: string;
}
