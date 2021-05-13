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

  const createdDate = new Date().toISOString();

  if (comments && Array.isArray(comments) && comments.length > 0) {
    for (const currentComment of comments) {
      await externalService.createComment({
        incidentId: res.id,
        comment: currentComment,
        createdDate,
      });
    }
  }

  return res;
};

export const api: ExternalServiceApi = {
  createRecord: createRecordHandler,
  pushToService: pushToServiceHandler,
};
