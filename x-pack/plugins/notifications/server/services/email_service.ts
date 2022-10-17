/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnsecuredActionsClient } from '@kbn/actions-plugin/server/unsecured_actions_client/unsecured_actions_client';
import type { IEmailService, PlainTextEmail } from './types';

export class EmailService implements IEmailService {
  constructor(
    private requesterId: string,
    private connectorId: string,
    private actionsClient: UnsecuredActionsClient
  ) {}

  async sendPlainTextEmail(params: PlainTextEmail): Promise<void> {
    const actions = params.to.map((to) => ({
      id: this.connectorId,
      spaceId: 'default', // TODO should be space agnostic?
      apiKey: null, // not needed for Email connector
      executionId: '???',
      params: {
        ...params,
        to,
      },
    }));
    return await this.actionsClient.bulkEnqueueExecution(this.requesterId, actions);
  }
}
