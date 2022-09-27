/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';

export interface TextBasedLanguagesLayerColumn {
  columnId: string;
  fieldName: string;
  meta?: DatatableColumn['meta'];
}

export interface TextBasedLanguageField {
  id: string;
  field: string;
}

export interface TextBasedLanguagesLayer {
  index: string;
  query: AggregateQuery | undefined;
  columns: TextBasedLanguagesLayerColumn[];
  allColumns: TextBasedLanguagesLayerColumn[];
  timeField?: string;
  errors?: Error[];
}

export interface TextBasedLanguagesPersistedState {
  layers: Record<string, TextBasedLanguagesLayer>;
}

export type TextBasedLanguagesPrivateState = TextBasedLanguagesPersistedState & {
  indexPatternRefs: IndexPatternRef[];
  fieldList: DatatableColumn[];
};

export interface IndexPatternRef {
  id: string;
  title: string;
  timeField?: string;
}
