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
 * Request params for alert queries.
 */
export interface AlertRequestParams {
  page_index?: number;
  page_size?: number;
}
