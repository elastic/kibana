/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { RelatedSavedObjects } from '@kbn/actions-plugin/server/lib/related_saved_objects';
import type { EmailService, PlainTextEmail, RelatedSavedObject } from './types';

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
        relatedSavedObjects: this._getRelatedSavedObjects(params.context!.relatedObjects!),
      }),
    }));
    return await this.actionsClient.bulkEnqueueExecution(this.requesterId, actions);
  }

  private _getRelatedSavedObjects(relatedObjects: RelatedSavedObject[]): RelatedSavedObjects {
    return relatedObjects.map(({ id, type, spaceId: namespace }) => ({ id, type, namespace }));
  }
}
