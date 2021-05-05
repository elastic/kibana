/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateRecordApiHandlerArgs,
  ExternalServiceIncidentResponse,
  ExternalServiceApi,
  Incident,
  PushToServiceApiHandlerArgs,
} from './types';

const createRecordHandler = async ({
  externalService,
  params,
}: CreateRecordApiHandlerArgs): Promise<ExternalServiceIncidentResponse> => {
  return await externalService.createRecord({ incident: { ...params, externalId: null } });
};

const pushToServiceHandler = async ({
  externalService,
  params,
}: PushToServiceApiHandlerArgs): Promise<ExternalServiceIncidentResponse> => {
  const { comments } = params;
  let res: ExternalServiceIncidentResponse;
  const incident: Incident = params.incident;

  if (incident.externalId != null) {
    res = await externalService.updateRecord({
      incidentId: incident.externalId,
      incident,
    });
  } else {
    res = await externalService.createRecord({ incident });
  }

  console.log('TO DO comments', comments);
  // if (comments && Array.isArray(comments) && comments.length > 0) {
  //   res.comments = [];
  //   for (const currentComment of comments) {
  //     const comment = await externalService.createComment({
  //       incidentId: res.id,
  //       comment: currentComment,
  //     });
  //     res.comments = [
  //       ...(res.comments ?? []),
  //       {
  //         commentId: comment.commentId,
  //         pushedDate: comment.pushedDate,
  //       },
  //     ];
  //   }
  // }

  return res;
};

export const api: ExternalServiceApi = {
  createRecord: createRecordHandler,
  pushToService: pushToServiceHandler,
};
