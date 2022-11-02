/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { EmailService, PlainTextEmail } from './types';

export class ConnectorsEmailService implements EmailService {
  constructor(
    private requesterId: string,
    private connectorId: string,
    private actionsClient: IUnsecuredActionsClient
  ) {}

  async sendPlainTextEmail(params: PlainTextEmail): Promise<void> {
    const actions = params.to.map((to) => ({
      id: this.connectorId,
      params: {
        to: [to],
        subject: params.subject,
        message: params.message,
      },
      ...(params.context?.relatedObjects?.length && {
        relatedSavedObjects: params.context!.relatedObjects!.map(
          ({ id, type, spaceId: namespace }) => ({ id, type, namespace })
        ),
      }),
    }));
    return await this.actionsClient.bulkEnqueueExecution(this.requesterId, actions);
  }
}
