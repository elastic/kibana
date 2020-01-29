/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LoggerFactory } from 'kibana/server';
import { EndpointConfigType } from './config';

export interface EndpointAppContext {
  logFactory: LoggerFactory;
  config(): Promise<EndpointConfigType>;
}
