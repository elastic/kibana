/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  PushToServiceApiHandlerArgs,
  HandshakeApiHandlerArgs,
  GetIncidentApiHandlerArgs,
  ExternalServiceApi,
  PushToServiceResponse,
  GetCommonFieldsHandlerArgs,
  GetCommonFieldsResponse,
} from './types';

const handshakeHandler = async ({ externalService, params }: HandshakeApiHandlerArgs) => {};
const getIncidentHandler = async ({ externalService, params }: GetIncidentApiHandlerArgs) => {};

const pushToServiceHandler = async ({
  externalService,
  params,
  secrets,
}: PushToServiceApiHandlerArgs): Promise<PushToServiceResponse> => {
  const { externalId, comments } = params;
  let res: PushToServiceResponse;

  const incident = { ...params, short_description: params.title, comments: params.comment };

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

  // TODO: should temporary keep comments for a Case usage
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
