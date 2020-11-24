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
  Incident,
  GetIncidentTypesHandlerArgs,
  GetSeverityHandlerArgs,
  PushToServiceResponse,
  GetCommonFieldsHandlerArgs,
} from './types';

const handshakeHandler = async ({ externalService, params }: HandshakeApiHandlerArgs) => {};

const getIncidentHandler = async ({ externalService, params }: GetIncidentApiHandlerArgs) => {};

const getFieldsHandler = async ({ externalService }: GetCommonFieldsHandlerArgs) => {
  const res = await externalService.getFields();
  return res;
};
const getIncidentTypesHandler = async ({ externalService }: GetIncidentTypesHandlerArgs) => {
  const res = await externalService.getIncidentTypes();
  return res;
};

const getSeverityHandler = async ({ externalService }: GetSeverityHandlerArgs) => {
  const res = await externalService.getSeverity();
  return res;
};

const pushToServiceHandler = async ({
  externalService,
  params,
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
      incident,
    });
  }

  if (comments && Array.isArray(comments) && comments.length > 0) {
    res.comments = [];
    for (const currentComment of comments) {
      const comment = await externalService.createComment({
        incidentId: res.id,
        comment: currentComment,
      });
      res.comments = [
        ...(res.comments ?? []),
        {
          commentId: comment.commentId,
          pushedDate: comment.pushedDate,
        },
      ];
    }
  }

  return res;
};

export const api: ExternalServiceApi = {
  getFields: getFieldsHandler,
  getIncident: getIncidentHandler,
  handshake: handshakeHandler,
  incidentTypes: getIncidentTypesHandler,
  pushToService: pushToServiceHandler,
  severity: getSeverityHandler,
};
