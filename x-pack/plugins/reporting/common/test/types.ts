/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportApiJSON } from '../types';

/** @internal */
export interface PayloadMock {
  payload: Omit<ReportApiJSON['payload'], 'browserTimezone' | 'version' | 'layout'>;
}

/** @internal */
export type ReportMock = Omit<
  ReportApiJSON,
  | 'index'
  | 'migration_version'
  | 'browser_type'
  | 'max_attempts'
  | 'timeout'
  | 'created_by'
  | 'payload'
> &
  PayloadMock;
