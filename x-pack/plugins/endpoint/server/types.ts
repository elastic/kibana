/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LoggerFactory } from 'kibana/server';
import { EndpointConfigType } from './config';

/**
 * A JSON-like structure.
 */
export interface JSONish {
  [key: string]: number | string | null | undefined | JSONish | JSONish[];
}

/**
 * The context for Endpoint apps.
 */
export interface EndpointAppContext {
  logFactory: LoggerFactory;
  config(): Promise<EndpointConfigType>;
}

/**
 * Custom validation error class for the Endpoint app.
 */
export class EndpointValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EndpointValidationError';
  }
}

/**
 * Request params for alert queries.
 */
export interface AlertRequestParams {
  page_index?: number;
  page_size?: number;
  filters?: string;
  sort?: string;
  order?: string;
  search_after?: string;
  search_before?: string;
}

/**
 * Request metadata for additional context.
 */
export interface AlertRequestData {
  pageSize: number;
  pageIndex?: number;
  fromIndex?: number;
  filters: string; // Defaults to ''
  sort: string;
  order: string;
  searchAfter?: string;
  searchBefore?: string;
  next?: string;
  prev?: string;
}
