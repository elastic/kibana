/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ResponseErrorAttributes } from '@kbn/core/server';
import type { DataViewBase } from '@kbn/es-query';
import { FieldSpec } from '@kbn/data-views-plugin/common';

export interface ServerApiError {
  statusCode: number;
  error: string;
  message: string;
  attributes?: ResponseErrorAttributes | undefined;
}

export interface SecuritySolutionUiConfigType {
  enableExperimental: string[];
}

/**
 * DataViewBase with enhanced index fields used in timelines
 */
export interface SecuritySolutionDataViewBase extends DataViewBase {
  fields: FieldSpec[];
}
