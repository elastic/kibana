/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpResponse } from '@kbn/core/public';

/**
 * These types track an API call's status and result
 * Each Status string corresponds to a possible status in a request's lifecycle
 */

export const enum Status {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR,
}

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  attributes: {
    errors: string[];
  };
}

export type HttpError = HttpResponse<ErrorResponse>;

export interface ApiSuccess<T> {
  status: Status.SUCCESS;
  data: T;
  error?: undefined;
}

export interface ApiPending<T> {
  status: Status.LOADING;
  data?: T;
  error?: undefined;
}

export interface ApiIdle<T> {
  status: Status.IDLE;
  data?: T;
  error?: undefined;
}

export interface ApiError {
  status: Status.ERROR;
  error: HttpError;
  data?: undefined;
}

export type ApiStatus<T> = ApiSuccess<T> | ApiPending<T> | ApiIdle<T> | ApiError;
