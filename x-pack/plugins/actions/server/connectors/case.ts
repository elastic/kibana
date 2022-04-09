/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  ExternalServiceIncidentResponse,
  PushToServiceParams,
  PushToServiceResponse,
} from './types';
import { BasicConnector } from './basic';
import { ServiceParams } from '../http_framework/types';

export interface CaseConnectorInterface {
  addComment: ({
    incidentId,
    comment,
  }: {
    incidentId: string;
    comment: string;
  }) => Promise<unknown>;
  createIncident: (incident: Record<string, unknown>) => Promise<ExternalServiceIncidentResponse>;
  updateIncident: ({
    incidentId,
    incident,
  }: {
    incidentId: string;
    incident: Record<string, unknown>;
  }) => Promise<ExternalServiceIncidentResponse>;
  getIncident: ({ id }: { id: string }) => Promise<unknown>;
  pushToService: (params: PushToServiceParams) => Promise<PushToServiceResponse>;
}

export abstract class CaseConnector<Config, Secrets>
  extends BasicConnector<Config, Secrets>
  implements CaseConnectorInterface
{
  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.registerSubAction({
      name: 'pushToService',
      method: 'pushToService',
      schema: schema.object(
        {
          externalId: schema.nullable(schema.string()),
          comments: schema.nullable(
            schema.arrayOf(
              schema.object({
                comment: schema.string(),
                commentId: schema.string(),
              })
            )
          ),
        },
        { unknowns: 'allow' }
      ),
    });
  }

  public abstract addComment({
    incidentId,
    comment,
  }: {
    incidentId: string;
    comment: string;
  }): Promise<unknown>;

  public abstract createIncident(
    incident: Record<string, unknown>
  ): Promise<ExternalServiceIncidentResponse>;
  public abstract updateIncident({
    incidentId,
    incident,
  }: {
    incidentId: string;
    incident: Record<string, unknown>;
  }): Promise<ExternalServiceIncidentResponse>;
  public abstract getIncident({ id }: { id: string }): Promise<ExternalServiceIncidentResponse>;

  public async pushToService(params: PushToServiceParams) {
    const { externalId, comments, ...rest } = params;

    let res: PushToServiceResponse;

    if (externalId != null) {
      res = await this.updateIncident({
        incidentId: externalId,
        incident: rest,
      });
    } else {
      res = await this.createIncident({
        ...rest,
      });
    }

    if (comments && Array.isArray(comments) && comments.length > 0) {
      res.comments = [];

      for (const currentComment of comments) {
        await this.addComment({
          incidentId: res.id,
          comment: currentComment.comment,
        });

        res.comments = [
          ...(res.comments ?? []),
          {
            commentId: currentComment.commentId,
            pushedDate: res.pushedDate,
          },
        ];
      }
    }

    return res;
  }
}
