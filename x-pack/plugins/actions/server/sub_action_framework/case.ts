/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, Type } from '@kbn/config-schema';
import {
  ExternalServiceIncidentResponse,
  PushToServiceParams,
  PushToServiceResponse,
} from './types';
import { SubActionConnector } from './sub_action_connector';
import { ServiceParams } from './types';

export interface CaseConnectorInterface {
  addComment: ({ incidentId, comment }: { incidentId: string; comment: string }) => Promise<void>;
  createIncident: <T>(incident: T) => Promise<ExternalServiceIncidentResponse>;
  updateIncident: <T>({
    incidentId,
    incident,
  }: {
    incidentId: string;
    incident: T;
  }) => Promise<ExternalServiceIncidentResponse>;
  getIncident: <R, T>(params: R) => Promise<T>;
  pushToService: <T extends PushToServiceParams>(params: T) => Promise<PushToServiceResponse>;
}

export abstract class CaseConnector<Config, Secrets>
  extends SubActionConnector<Config, Secrets>
  implements CaseConnectorInterface
{
  constructor(
    params: ServiceParams<Config, Secrets>,
    pushToServiceIncidentParamsSchema: Record<string, Type<unknown> | null>
  ) {
    super(params);

    this.registerSubAction({
      name: 'pushToService',
      method: 'pushToService',
      schema: schema.object({
        incident: schema
          .object({ externalId: schema.nullable(schema.string()) })
          .extends(pushToServiceIncidentParamsSchema),
        comments: schema.nullable(
          schema.arrayOf(
            schema.object({
              comment: schema.string(),
              commentId: schema.string(),
            })
          )
        ),
      }),
    });
  }

  public abstract addComment({
    incidentId,
    comment,
  }: {
    incidentId: string;
    comment: string;
  }): Promise<void>;

  public abstract createIncident<T>(incident: T): Promise<ExternalServiceIncidentResponse>;
  public abstract updateIncident<T>({
    incidentId,
    incident,
  }: {
    incidentId: string;
    incident: T;
  }): Promise<ExternalServiceIncidentResponse>;
  public abstract getIncident<R, T>(params: R): Promise<T>;

  public async pushToService<T extends PushToServiceParams>(params: T) {
    const { incident, comments } = params;
    const { externalId, ...rest } = incident;

    let res: PushToServiceResponse;

    if (externalId != null) {
      res = await this.updateIncident({
        incidentId: externalId,
        incident: rest,
      });
    } else {
      res = await this.createIncident(rest);
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
