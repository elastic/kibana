/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface EsDSLLayer {
  index: string;
  query: string;
  columns: Array<{ columnId: string; fieldName: string }>;
  timeField?: string;
  overwrittenFieldTypes?: Record<string, string>;
}

export interface EsDSLPersistedState {
  layers: Record<string, EsDSLLayer>;
}

export type EsDSLPrivateState = EsDSLPersistedState & {
  cachedFieldList: Record<
    string,
    { fields: Array<{ name: string; type: string }>; singleRow: boolean }
  >;
  removedLayers: Array<{
    layer: EsDSLLayer;
    fieldList: { fields: Array<{ name: string; type: string }>; singleRow: boolean };
  }>;
};
