/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExternalServiceAPI,
  GetChoicesHandlerArgs,
  GetChoicesResponse,
  GetCommonFieldsHandlerArgs,
  GetCommonFieldsResponse,
  GetIncidentApiHandlerArgs,
  HandshakeApiHandlerArgs,
  Incident,
  PushToServiceApiHandlerArgs,
  PushToServiceResponse,
} from './types';

const handshakeHandler = async ({ externalService, params }: HandshakeApiHandlerArgs) => {};
const getIncidentHandler = async ({ externalService, params }: GetIncidentApiHandlerArgs) => {
  const { externalId: id } = params;
  const res = await externalService.getIncident(id);
  return res;
};

const pushToServiceHandler = async ({
  externalService,
  params,
  secrets,
  commentFieldKey,
}: PushToServiceApiHandlerArgs): Promise<PushToServiceResponse> => {
  const { comments } = params;
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
        opened_by: secrets.username,
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
          [commentFieldKey]: currentComment.comment,
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

const getChoicesHandler = async ({
  externalService,
  params,
}: GetChoicesHandlerArgs): Promise<GetChoicesResponse> => {
  const res = await externalService.getChoices(params.fields);
  return res;
};

export const api: ExternalServiceAPI = {
  getChoices: getChoicesHandler,
  getFields: getFieldsHandler,
  getIncident: getIncidentHandler,
  handshake: handshakeHandler,
  pushToService: pushToServiceHandler,
};
