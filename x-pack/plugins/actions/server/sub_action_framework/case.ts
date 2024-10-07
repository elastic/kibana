/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, Type } from '@kbn/config-schema';
import { ExternalServiceIncidentResponse, PushToServiceResponse } from './types';
import { SubActionConnector } from './sub_action_connector';
import { ServiceParams } from './types';
import { ConnectorUsageCollector } from '../usage';

export interface CaseConnectorInterface<Incident, GetIncidentResponse> {
  addComment: (
    { incidentId, comment }: { incidentId: string; comment: string },
    connectorUsageCollector: ConnectorUsageCollector
  ) => Promise<void>;
  createIncident: (
    incident: Incident,
    connectorUsageCollector: ConnectorUsageCollector
  ) => Promise<ExternalServiceIncidentResponse>;
  updateIncident: (
    {
      incidentId,
      incident,
    }: {
      incidentId: string;
      incident: Incident;
    },
    connectorUsageCollector: ConnectorUsageCollector
  ) => Promise<ExternalServiceIncidentResponse>;
  getIncident: (
    { id }: { id: string },
    connectorUsageCollector: ConnectorUsageCollector
  ) => Promise<GetIncidentResponse>;
  pushToService: (
    params: {
      incident: { externalId: string | null } & Incident;
      comments: Array<{ commentId: string; comment: string }>;
    },
    connectorUsageCollector: ConnectorUsageCollector
  ) => Promise<PushToServiceResponse>;
}

export abstract class CaseConnector<Config, Secrets, Incident, GetIncidentResponse>
  extends SubActionConnector<Config, Secrets>
  implements CaseConnectorInterface<Incident, GetIncidentResponse>
{
  constructor(
    params: ServiceParams<Config, Secrets>,
    pushToServiceIncidentParamsSchema: Record<string, Type<unknown>>
  ) {
    super(params);

    this.registerSubAction({
      name: 'pushToService',
      method: 'pushToService',
      schema: schema.object({
        incident: schema
          .object(pushToServiceIncidentParamsSchema)
          .extends({ externalId: schema.nullable(schema.string()) }),
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

  public abstract addComment(
    {
      incidentId,
      comment,
    }: {
      incidentId: string;
      comment: string;
    },
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<void>;

  public abstract createIncident(
    incident: Incident,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<ExternalServiceIncidentResponse>;
  public abstract updateIncident(
    {
      incidentId,
      incident,
    }: {
      incidentId: string;
      incident: Incident;
    },
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<ExternalServiceIncidentResponse>;
  public abstract getIncident(
    { id }: { id: string },
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<GetIncidentResponse>;

  public async pushToService(
    params: {
      incident: { externalId: string | null } & Incident;
      comments: Array<{ commentId: string; comment: string }>;
    },
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    const { incident, comments } = params;
    const { externalId, ...rest } = incident;

    let res: PushToServiceResponse;

    if (externalId != null) {
      res = await this.updateIncident(
        {
          incidentId: externalId,
          incident: rest as Incident,
        },
        connectorUsageCollector
      );
    } else {
      res = await this.createIncident(rest as Incident, connectorUsageCollector);
    }

    if (comments && Array.isArray(comments) && comments.length > 0) {
      res.comments = [];

      for (const currentComment of comments) {
        await this.addComment(
          {
            incidentId: res.id,
            comment: currentComment.comment,
          },
          connectorUsageCollector
        );

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
