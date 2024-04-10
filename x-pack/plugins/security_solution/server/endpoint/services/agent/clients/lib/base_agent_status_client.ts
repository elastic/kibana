/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { AgentStatusRecords } from '../../../../../../common/endpoint/types/agents';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { EndpointAppContextService } from '../../../../endpoint_app_context_services';
import type { AgentStatusClientInterface } from './types';
import { AgentStatusClientError, AgentStatusNotSupportedError } from '../errors';
import { HOST_NOT_ENROLLED } from '../../../actions/clients/lib/base_response_actions_client';

export interface AgentStatusClientOptions {
  endpointService: EndpointAppContextService;
  esClient: ElasticsearchClient;
}

export type AgentStatusClientValidateRequestResponse =
  | {
      isValid: true;
      error: undefined;
    }
  | {
      isValid: false;
      error: AgentStatusClientError;
    };

export abstract class AgentStatusClient implements AgentStatusClientInterface {
  protected readonly log: Logger;
  protected abstract readonly agentType: ResponseActionAgentType;

  constructor(protected readonly options: AgentStatusClientOptions) {
    this.log = options.endpointService.createLogger(this.constructor.name ?? 'AgentStatusClient');
  }

  /**
   * Provides validations against a response action request and returns the result.
   * Checks made should be generic to all response actions and not specific to any one action.
   *
   * @param agentIds
   * @param agentType
   * @protected
   */
  protected async validateRequest(
    agentIds: string[],
    agentType: ResponseActionAgentType
  ): Promise<AgentStatusClientValidateRequestResponse> {
    if (agentIds.length === 0) {
      return {
        isValid: false,
        error: new AgentStatusClientError(HOST_NOT_ENROLLED, 400),
      };
    }

    if (agentType !== this.agentType) {
      return {
        isValid: false,
        error: new AgentStatusClientError(
          `Agent type [${agentType}] does not support agent status`,
          501
        ),
      };
    }

    return { isValid: true, error: undefined };
  }

  public async getAgentStatuses(agentIds: string[]): Promise<AgentStatusRecords> {
    throw new AgentStatusNotSupportedError(agentIds, this.agentType);
  }
}
