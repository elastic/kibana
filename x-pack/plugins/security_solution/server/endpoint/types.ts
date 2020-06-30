/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LoggerFactory } from 'kibana/server';
import { EndpointAppContextService } from './endpoint_app_context_services';
import { ConfigType } from '../config';

/**
 * The context for Endpoint apps.
 */
export interface EndpointAppContext {
  logFactory: LoggerFactory;
  config(): Promise<ConfigType>;

  /**
   * Object readiness is tied to plugin start method
   */
  service: EndpointAppContextService;
}
