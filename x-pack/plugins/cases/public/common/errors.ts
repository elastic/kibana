/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';

export interface AppError {
  name: string;
  message: string;
  body: {
    message: string;
  };
}

export interface KibanaError extends AppError {
  body: {
    message: string;
    statusCode: number;
  };
}

export interface CasesAppError extends AppError {
  body: {
    message: string;
    status_code: number;
  };
}

export const isKibanaError = (error: unknown): error is KibanaError =>
  has('message', error) && has('body.message', error) && has('body.statusCode', error);

export const isCasesAppError = (error: unknown): error is CasesAppError =>
  has('message', error) && has('body.message', error) && has('body.status_code', error);

export const isAppError = (error: unknown): error is AppError =>
  isKibanaError(error) || isCasesAppError(error);
