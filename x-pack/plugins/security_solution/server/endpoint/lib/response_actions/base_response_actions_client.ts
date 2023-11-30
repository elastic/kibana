/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type { Logger } from '@kbn/logging';
import { v4 as uuidv4 } from 'uuid';
import { ResponseActionsClientError } from '../../services/actions/clients/errors';
import {
  addRuleInfoToAction,
  getActionParameters,
  getActionRequestExpiration,
} from '../../services/actions/create/write_action_to_indices';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../common/endpoint/constants';
import type { EndpointAppContext } from '../../types';
import type { ResponseActionsClient } from './types';
import type {
  ActionDetails,
  GetProcessesActionOutputContent,
  KillOrSuspendProcessRequestBody,
  KillProcessActionOutputContent,
  ResponseActionExecuteOutputContent,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
  ResponseActionParametersWithPidOrEntityId,
  ResponseActionsExecuteParameters,
  ResponseActionUploadOutputContent,
  ResponseActionUploadParameters,
  SuspendProcessActionOutputContent,
  LogsEndpointAction,
  EndpointActionDataParameterTypes,
} from '../../../../common/endpoint/types';
import type {
  IsolationRouteRequestBody,
  ExecuteActionRequestBody,
  GetProcessesRequestBody,
  ResponseActionGetFileRequestBody,
  UploadActionApiRequestBody,
  ResponseActionsRequestBody,
} from '../../../../common/api/endpoint';
import type { CreateActionPayload } from '../../services/actions/create/types';

export interface ResponseActionsClientOptions {
  endpointContext: EndpointAppContext;
  esClient: ElasticsearchClient;
  casesClient?: CasesClient;
  /** Username that will be stored along with the action's ES documents */
  username: string;
}

/**
 * Base class for a Response Actions client
 */
export abstract class ResponseActionsClientImpl implements ResponseActionsClient {
  protected readonly log: Logger;

  constructor(protected readonly options: ResponseActionsClientOptions) {
    this.log = options.endpointContext.logFactory.get(
      this.constructor.name ?? 'ResponseActionsClient'
    );
  }

  // TODO:PT implement a generic way to update cases without relying on the Attachments being endpoint agents
  // protected async updateCases(): Promise<void> {
  //   throw new Error('Method not yet implemented');
  // }

  /**
   * Creates a Response Action request document in the Endpoint index (`.logs-endpoint.actions-default`)
   * @protected
   */
  protected async writeActionRequestToEndpointIndex(
    actionRequest: ResponseActionsRequestBody &
      Pick<CreateActionPayload, 'command' | 'hosts' | 'rule_id' | 'rule_name'>
  ): Promise<LogsEndpointAction> {
    const doc: LogsEndpointAction = {
      '@timestamp': new Date().toISOString(),
      agent: {
        id: actionRequest.endpoint_ids,
      },
      EndpointActions: {
        action_id: uuidv4(),
        expiration: getActionRequestExpiration(),
        type: 'INPUT_ACTION',
        input_type: 'endpoint',
        data: {
          command: actionRequest.command,
          comment: actionRequest.comment ?? undefined,
          ...(actionRequest.alert_ids ? { alert_id: actionRequest.alert_ids } : {}),
          ...(actionRequest.hosts ? { hosts: actionRequest.hosts } : {}),
          parameters: getActionParameters(actionRequest) as EndpointActionDataParameterTypes,
        },
      },
      user: {
        id: this.options.username,
      },
      ...addRuleInfoToAction(actionRequest),
    };

    try {
      const logsEndpointActionsResult = await this.options.esClient.index<LogsEndpointAction>(
        {
          index: ENDPOINT_ACTIONS_INDEX,
          document: doc,
          refresh: 'wait_for',
        },
        { meta: true }
      );

      if (logsEndpointActionsResult.statusCode !== 201) {
        throw new ResponseActionsClientError(
          `Failed to create action request document. Received: [${logsEndpointActionsResult.statusCode}][${logsEndpointActionsResult.body.result}]`,
          500,
          logsEndpointActionsResult
        );
      }

      return doc;
    } catch (err) {
      if (!(err instanceof ResponseActionsClientError)) {
        throw new ResponseActionsClientError(
          `Failed to create action request document: ${err.message}`,
          500,
          err
        );
      }

      throw err;
    }
  }

  public abstract isolate(options: IsolationRouteRequestBody): Promise<ActionDetails>;

  public abstract release(options: IsolationRouteRequestBody): Promise<ActionDetails>;

  public abstract killProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  >;

  public abstract suspendProcess(
    options: KillOrSuspendProcessRequestBody
  ): Promise<
    ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithPidOrEntityId>
  >;

  public abstract runningProcesses(
    options: GetProcessesRequestBody
  ): Promise<ActionDetails<GetProcessesActionOutputContent>>;

  public abstract getFile(
    options: ResponseActionGetFileRequestBody
  ): Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>>;

  public abstract execute(
    options: ExecuteActionRequestBody
  ): Promise<ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>>;

  public abstract upload(
    options: UploadActionApiRequestBody
  ): Promise<ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>>;
}
