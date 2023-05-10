/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseErrorAttributes } from '@kbn/core/server';
import type { DataViewBase } from '@kbn/es-query';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { BrowserField } from './containers/source';
import type { FieldsData } from './components/event_details/types';

export interface ServerApiError {
  statusCode: number;
  error: string;
  message: string;
  attributes?: ResponseErrorAttributes | undefined;
}

export interface SecuritySolutionUiConfigType {
  enableExperimental: string[];
  prebuiltRulesPackageVersion?: string;
}

/**
 * DataViewBase with enhanced index fields used in timelines
 */
export interface SecuritySolutionDataViewBase extends DataViewBase {
  fields: FieldSpec[];
  getName?: () => string;
}

export type AlertWorkflowStatus = 'open' | 'closed' | 'acknowledged';
export type Refetch = () => void;

/**
 * Converts a legacy BrowserField type to a FieldSpec type
 */
export const browserFieldToFieldSpec = (
  browserField: BrowserField | undefined,
  data: FieldsData
): FieldSpec => ({
  name: browserField?.name ?? data.field,
  type: browserField?.type ?? data.type,
  aggregatable: browserField?.aggregatable ?? false,
  searchable: browserField?.searchable ?? false,
  esTypes: browserField?.esTypes,
  subType: browserField?.subType,
  readFromDocValues: browserField?.readFromDocValues,
  runtimeField: browserField?.runtimeField,
});
