/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseActionsClientImpl } from './base_response_actions_client';
import type { ActionDetails } from '../../../../common/endpoint/types';

describe('`ResponseActionsClientImpl` class', () => {
  const MockClassWithExposedProtectedMembers = class extends ResponseActionsClientImpl {
    public async updateCases({
      command,
      hosts,
      caseIds = [],
      alertIds = [],
      comment = '',
    }: {
      command: ResponseActionsApiCommandNames;
      hosts: Array<{ hostname: string; endpointId: string }>;
      caseIds?: string[];
      alertIds?: string[];
      comment?: string;
    }): Promise<void> {
      return super.updateCases({
        command,
        hosts,
        caseIds = [],
        alertIds = [],
        comment = '',
      });
    }

    public async fetchActionDetails<T extends ActionDetails = ActionDetails>(
      actionId: string
    ): Promise<T> {
      return super.fetchActionDetails(actionId);
    }

    public async writeActionRequestToEndpointIndex(
      actionRequest: ResponseActionsRequestBody &
        Pick<CreateActionPayload, 'command' | 'hosts' | 'rule_id' | 'rule_name'>
    ): Promise<LogsEndpointAction> {
      return super.writeActionRequestToEndpointIndex(actionRequest);
    }

    public async writeActionResponseToEndpointIndex<TOutputContent extends object = object>({
      actionId,
      error,
      agentId,
      data,
    }: { agentId: LogsEndpointActionResponse['agent']['id']; actionId: string } & Pick<
      LogsEndpointActionResponse,
      'error'
    > &
      Pick<LogsEndpointActionResponse<TOutputContent>['EndpointActions'], 'data'>): Promise<
      LogsEndpointActionResponse<TOutputContent>
    > {
      return super.writeActionResponseToEndpointIndex({
        actionId,
        error,
        agentId,
        data,
      });
    }
  };

  describe('#updateCases()', () => {
    //
  });
});
