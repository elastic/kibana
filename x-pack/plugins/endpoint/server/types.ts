/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LoggerFactory } from 'kibana/server';
import { EndpointConfigType } from './config';
import { IndexPatternRetriever } from './index_pattern';
import { AgentService } from '../../ingest_manager/common/types';

/**
 * The context for Endpoint apps.
 */
export interface EndpointAppContext {
  indexPatternRetriever: IndexPatternRetriever;
  agentService: AgentService;
  logFactory: LoggerFactory;
  config(): Promise<EndpointConfigType>;
}
