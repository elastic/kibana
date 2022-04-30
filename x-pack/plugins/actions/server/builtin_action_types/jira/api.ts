/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PushToServiceApiHandlerArgs,
  HandshakeApiHandlerArgs,
  GetIncidentApiHandlerArgs,
  ExternalServiceApi,
  Incident,
  GetFieldsByIssueTypeHandlerArgs,
  GetIssueTypesHandlerArgs,
  GetIssuesHandlerArgs,
  PushToServiceResponse,
  GetIssueHandlerArgs,
  GetCommonFieldsHandlerArgs,
} from './types';

const handshakeHandler = async ({ externalService, params }: HandshakeApiHandlerArgs) => {};

const getIncidentHandler = async ({ externalService, params }: GetIncidentApiHandlerArgs) => {
  const res = await externalService.getIncident(params.externalId);
  return res;
};

const getIssueTypesHandler = async ({ externalService }: GetIssueTypesHandlerArgs) => {
  const res = await externalService.getIssueTypes();
  return res;
};

const getFieldsHandler = async ({ externalService }: GetCommonFieldsHandlerArgs) => {
  const res = await externalService.getFields();
  return res;
};

const getFieldsByIssueTypeHandler = async ({
  externalService,
  params,
}: GetFieldsByIssueTypeHandlerArgs) => {
  const { id } = params;
  const res = await externalService.getFieldsByIssueType(id);
  return res;
};

const getIssuesHandler = async ({ externalService, params }: GetIssuesHandlerArgs) => {
  const { title } = params;
  const res = await externalService.getIssues(title);
  return res;
};

const getIssueHandler = async ({ externalService, params }: GetIssueHandlerArgs) => {
  const { id } = params;
  const res = await externalService.getIssue(id);
  return res;
};

const pushToServiceHandler = async ({
  externalService,
  params,
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
      incident,
    });
  }

  if (comments && Array.isArray(comments) && comments.length > 0) {
    res.comments = [];
    for (const currentComment of comments) {
      if (!currentComment.comment) {
        continue;
      }
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
  handshake: handshakeHandler,
  pushToService: pushToServiceHandler,
  getIncident: getIncidentHandler,
  issueTypes: getIssueTypesHandler,
  fieldsByIssueType: getFieldsByIssueTypeHandler,
  issues: getIssuesHandler,
  issue: getIssueHandler,
};
