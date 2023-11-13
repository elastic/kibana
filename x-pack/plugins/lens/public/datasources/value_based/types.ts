/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/public';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { VisualizeEditorContext } from '../../types';

export interface ValueBasedLayerColumn {
  columnId: string;
  fieldName: string;
  meta?: DatatableColumn['meta'];
}

export interface ValueBasedField {
  id: string;
  field: string;
}

export interface ValueBasedLayer {
  table: Datatable;
  columns: ValueBasedLayerColumn[];
  errors?: Error[];
}

export interface ValueBasedPersistedState {
  layers: Record<string, ValueBasedLayer>;
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  fieldList?: DatatableColumn[];
}

export type ValueBasedPrivateState = ValueBasedPersistedState;
