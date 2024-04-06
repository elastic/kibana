/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import { CoreKibanaRequest } from '@kbn/core/server';
import type { CancellableTask, ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import type { CasesClient } from '../../client';

export class BidirectionalSyncTaskRunner implements CancellableTask {
  private readonly taskInstance: ConcreteTaskInstance;
  private readonly getActionsClient: (request: KibanaRequest) => Promise<ActionsClient>;
  private readonly getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;

  constructor({
    taskInstance,
    getActionsClient,
    getCasesClient,
  }: {
    taskInstance: ConcreteTaskInstance;
    getActionsClient: (request: KibanaRequest) => Promise<ActionsClient>;
    getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
  }) {
    this.taskInstance = taskInstance;
    this.getActionsClient = getActionsClient;
    this.getCasesClient = getCasesClient;
  }

  public async run() {
    const { params, state } = this.taskInstance;
    const fakeRequest = CoreKibanaRequest.from({
      headers: {
        authorization: 'ApiKey YVpYNVdvNEJNYjlSUXFKVTdtNFM6T09kZW1TeWpRMWFEVmxVbUlTVW5Tdw==',
      },
      path: '/',
    });

    console.log(`running task`, params, state);

    const { caseId } = params as { caseId: string };

    const actionsClient = await this.getActionsClient(fakeRequest);
    const casesClient = await this.getCasesClient(fakeRequest);

    const theCase = await casesClient.cases.get({ id: caseId });
    const connector = theCase.connector;
    const externalIncident = theCase.external_service;

    const res = await actionsClient.execute({
      actionId: connector.id,
      params: {
        subAction: 'getIncident',
        // need to push if the external incident is not defined
        subActionParams: { externalId: externalIncident?.external_id },
      },
    });

    if (res.data.status.id === '10004' && theCase.status !== 'closed') {
      console.log('mesa');
      await casesClient.cases.update({
        cases: [{ id: theCase.id, version: theCase.version, status: 'closed' }],
      });
    }
  }
  public async cancel() {}
}
