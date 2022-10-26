/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnsecuredActionsClient } from '@kbn/actions-plugin/server/unsecured_actions_client/unsecured_actions_client';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { EmailService, PlainTextEmail } from './types';

export class ConnectorsEmailService implements EmailService {
  constructor(
    private requesterId: string,
    private connectorId: string,
    private actionsClient: PublicMethodsOf<UnsecuredActionsClient>
  ) {}

  async sendPlainTextEmail(params: PlainTextEmail): Promise<void> {
    const actions = params.to.map((to) => ({
      id: this.connectorId,
      params: {
        to: [to],
        subject: params.subject,
        message: params.message,
      },
      relatedSavedObjects: params.context?.relatedObjects?.length
        ? params.context.relatedObjects
        : undefined,
    }));
    return await this.actionsClient.bulkEnqueueExecution(this.requesterId, actions);
  }
}
