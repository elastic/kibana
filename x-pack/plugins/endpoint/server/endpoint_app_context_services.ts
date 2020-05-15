/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IndexPatternRetriever } from './index_pattern';
import { AgentService } from '../../ingest_manager/server';

/**
 * A singleton that holds shared services that are initialized during the start up phase
 * of the plugin lifecycle. And stop during the stop phase, if needed.
 */
export class EndpointAppContextService {
  private indexPatternRetriever: IndexPatternRetriever | undefined;
  private agentService: AgentService | undefined;

  public start(dependencies: {
    indexPatternRetriever: IndexPatternRetriever;
    agentService: AgentService;
  }) {
    this.indexPatternRetriever = dependencies.indexPatternRetriever;
    this.agentService = dependencies.agentService;
  }

  public stop() {}

  public getAgentService(): AgentService {
    if (!this.agentService) {
      throw new Error(`must call start on ${EndpointAppContextService.name} to call getter`);
    }
    return this.agentService;
  }

  public getIndexPatternRetriever(): IndexPatternRetriever {
    if (!this.indexPatternRetriever) {
      throw new Error(`must call start on ${EndpointAppContextService.name} to call getter`);
    }
    return this.indexPatternRetriever;
  }
}
