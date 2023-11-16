/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsolationRouteRequestBody } from '../../../../../common/api/endpoint';
import type { ActionDetails, HostMetadata } from '../../../../../common/endpoint/types';
import { BaseActionsProvider } from '../../../lib/response_actions/base_actions_provider';

export class EndpointActionProvider extends BaseActionsProvider {
  private async checkAgentIds(ids: string[]): Promise<{
    valid: string[];
    invalid: string[];
    allValid: boolean;
  }> {
    const validIds = (
      await this.options.endpointContext.service
        .getEndpointMetadataService()
        .getMetadataForEndpoints(this.options.esClient, [...new Set(ids)])
    ).map((endpoint: HostMetadata) => endpoint.elastic.agent.id);

    const invalidIds = ids.filter((id) => !validIds.includes(id));

    return {
      valid: validIds,
      invalid: invalidIds,
      allValid: invalidIds.length === 0,
    };
  }

  private async hostIsolation(
    command: 'isolate' | 'unisolate',
    options: IsolationRouteRequestBody
  ): Promise<ActionDetails> {
    const agentIds = await this.checkAgentIds(options.endpoint_ids);

    if (!agentIds.allValid) {
      this.log.info(
        `The following agent ids are not valid - will skip them: ${JSON.stringify(
          agentIds.invalid
        )}`
      );
    }

    return this.options.endpointContext.service.getActionCreateService().createAction(
      {
        ...options,
        command,
        user: { username: this.options.username },
      },
      agentIds.valid
    );
  }

  async isolate(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    return this.hostIsolation('isolate', options);
  }

  async release(options: IsolationRouteRequestBody): Promise<ActionDetails> {
    return this.hostIsolation('unisolate', options);
  }
}
