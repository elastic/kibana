/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ExternalServiceApi,
  ExternalServiceParams,
  PushToServiceResponse,
  GetIncidentApiHandlerArgs,
  HandshakeApiHandlerArgs,
  PushToServiceApiHandlerArgs,
} from './types';
import { prepareFieldsForTransformation, transformFields, transformComments } from './utils';

const handshakeHandler = async ({
  externalService,
  mapping,
  params,
}: HandshakeApiHandlerArgs) => {};
const getIncidentHandler = async ({
  externalService,
  mapping,
  params,
}: GetIncidentApiHandlerArgs) => {};

const pushToServiceHandler = async ({
  externalService,
  mapping,
  params,
}: PushToServiceApiHandlerArgs): Promise<PushToServiceResponse> => {
  const { externalId, comments } = params;
  const updateIncident = externalId ? true : false;
  const defaultPipes = updateIncident ? ['informationUpdated'] : ['informationCreated'];
  let currentIncident: ExternalServiceParams | undefined;
  let res: PushToServiceResponse;

  if (externalId) {
    currentIncident = await externalService.getIncident(externalId);
  }

  const fields = prepareFieldsForTransformation({
    externalCase: params.externalCase,
    mapping,
    defaultPipes,
  });

  const incident = transformFields({
    params,
    fields,
    currentIncident,
  });

  if (updateIncident) {
    res = await externalService.updateIncident({ incidentId: externalId, incident });
  } else {
    res = await externalService.createIncident({ incident });
  }

  if (
    comments &&
    Array.isArray(comments) &&
    comments.length > 0 &&
    mapping.get('comments')?.actionType !== 'nothing'
  ) {
    const commentsTransformed = transformComments(comments, ['informationAdded']);

    res.comments = [];
    for (const currentComment of commentsTransformed) {
      const comment = await externalService.createComment({
        incidentId: res.id,
        comment: currentComment,
        field: mapping.get('comments')?.target ?? 'comments',
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
  handshake: handshakeHandler,
  pushToService: pushToServiceHandler,
  getIncident: getIncidentHandler,
};
