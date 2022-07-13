/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExternalServiceApi,
  Incident,
  PushToServiceApiHandlerArgs,
  PushToServiceResponse,
} from './types';

const pushToServiceHandler = async ({
  externalService,
  params,
}: PushToServiceApiHandlerArgs): Promise<PushToServiceResponse> => {
  const {
    incident: { externalId, ...rest },
    comments,
  } = params;
  const incident: Incident = rest;
  let res: PushToServiceResponse;

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
      await externalService.createComment({
        incidentId: res.id,
        comment: currentComment,
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
export const api: ExternalServiceApi = {
  pushToService: pushToServiceHandler,
};
