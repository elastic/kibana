/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPatternAggRestrictions } from '@kbn/data-plugin/public';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin';
import type { FieldFormatParams } from '@kbn/field-formats-plugin/common';

export type TableInspectorAdapter = Record<string, Datatable>;

export interface ErrorMessage {
  shortMessage: string;
  longMessage: React.ReactNode;
  type?: 'fixable' | 'critical';
}

export interface IndexPattern {
  id: string;
  fields: IndexPatternField[];
  getFieldByName(name: string): IndexPatternField | undefined;
  title: string;
  name?: string;
  timeFieldName?: string;
  fieldFormatMap?: Record<
    string,
    {
      id: string;
      params: FieldFormatParams;
    }
  >;
  hasRestrictions: boolean;
}

export type IndexPatternField = FieldSpec & {
  displayName: string;
  aggregationRestrictions?: Partial<IndexPatternAggRestrictions>;
  meta?: boolean;
  runtime?: boolean;
};
