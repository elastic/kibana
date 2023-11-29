/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type { Logger } from '@kbn/logging';
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
} from '../../../../common/endpoint/types';
import type {
  IsolationRouteRequestBody,
  ExecuteActionRequestBody,
  GetProcessesRequestBody,
  ResponseActionGetFileRequestBody,
  UploadActionApiRequestBody,
} from '../../../../common/api/endpoint';

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
