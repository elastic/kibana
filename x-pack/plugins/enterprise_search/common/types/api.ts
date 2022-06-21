/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * These types track an API call's status and result
 * Each Status string corresponds to a possible status in a request's lifecycle
 */

export type Status = 'IDLE' | 'PENDING' | 'SUCCESS' | 'ERROR';

export interface HttpError {
  code: number;
  message?: string;
}

export interface ApiSuccess<T> {
  status: 'SUCCESS';
  data: T;
}

export interface ApiPending<T> {
  status: 'PENDING';
  data?: T;
}

export interface ApiIdle<T> {
  status: 'IDLE';
  data?: T;
}

export interface ApiError {
  status: Status;
  error: HttpError;
}

export type ApiStatus<T> = ApiSuccess<T> | ApiPending<T> | ApiIdle<T> | ApiError;
