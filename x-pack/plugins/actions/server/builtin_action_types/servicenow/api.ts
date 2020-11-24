/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ExternalServiceApi,
  GetCommonFieldsHandlerArgs,
  GetCommonFieldsResponse,
  GetIncidentApiHandlerArgs,
  HandshakeApiHandlerArgs,
  Incident,
  PushToServiceApiHandlerArgs,
  PushToServiceResponse,
} from './types';

const handshakeHandler = async ({ externalService, params }: HandshakeApiHandlerArgs) => {};
const getIncidentHandler = async ({ externalService, params }: GetIncidentApiHandlerArgs) => {};

const pushToServiceHandler = async ({
  externalService,
  params,
  secrets,
}: PushToServiceApiHandlerArgs): Promise<PushToServiceResponse> => {
  const comments = params.comments;
  let res: PushToServiceResponse;
  const { externalId, ...rest } = params.incident;
  const incident: Incident = rest;

  if (externalId != null) {
    res = await externalService.updateIncident({
      incidentId: externalId,
      incident,
    });
  } else {
    res = await externalService.createIncident({
      incident: {
        ...incident,
        caller_id: secrets.username,
      },
    });
  }

  if (comments && Array.isArray(comments) && comments.length > 0) {
    res.comments = [];

    for (const currentComment of comments) {
      await externalService.updateIncident({
        incidentId: res.id,
        incident: {
          ...incident,
          comments: currentComment.comment,
        },
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
};

const getFieldsHandler = async ({
  externalService,
}: GetCommonFieldsHandlerArgs): Promise<GetCommonFieldsResponse> => {
  const res = await externalService.getFields();
  return res;
};

export const api: ExternalServiceApi = {
  getFields: getFieldsHandler,
  getIncident: getIncidentHandler,
  handshake: handshakeHandler,
  pushToService: pushToServiceHandler,
};
