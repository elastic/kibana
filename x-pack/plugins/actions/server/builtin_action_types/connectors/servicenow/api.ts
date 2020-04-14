/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { zipWith } from 'lodash';

import {
  ConnectorApi,
  ExternalServiceParams,
  ExternalServiceCommentResponse,
  Comment,
  PushToServiceResponse,
  ConnectorApiHandlerArgs,
} from '../types';
import { prepareFieldsForTransformation, transformFields, transformComments } from '../utils';

const handshakeHandler = async ({
  externalService,
  mapping,
  params,
}: ConnectorApiHandlerArgs) => {};
const getIncidentHandler = async ({
  externalService,
  mapping,
  params,
}: ConnectorApiHandlerArgs) => {};

const pushToServiceHandler = async ({
  externalService,
  mapping,
  params,
}: ConnectorApiHandlerArgs): Promise<PushToServiceResponse> => {
  const { externalId, comments } = params;
  const updateIncident = externalId ? true : false;
  const defaultPipes = updateIncident ? ['informationUpdated'] : ['informationCreated'];
  let currentIncident: ExternalServiceParams | undefined;
  let res: PushToServiceResponse;

  if (externalId) {
    currentIncident = await externalService.getIncident(externalId);
  }

  const fields = prepareFieldsForTransformation({
    params,
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
    mapping.get('comments').actionType !== 'nothing'
  ) {
    const commentsTransformed = transformComments(comments, ['informationAdded']);

    const createdComments = await Promise.all(
      commentsTransformed.map(comment =>
        externalService.createComment({
          incidentId: res.id,
          comment,
          field: mapping.get('comments').target,
        })
      )
    );

    const zippedComments: ExternalServiceCommentResponse[] = zipWith(
      commentsTransformed,
      createdComments,
      (a: Comment, b: ExternalServiceCommentResponse) => ({
        commentId: a.commentId,
        pushedDate: b.pushedDate,
      })
    );

    res.comments = [...zippedComments];
  }

  return res;
};

export const api: ConnectorApi = {
  handshake: handshakeHandler,
  pushToService: pushToServiceHandler,
  getIncident: getIncidentHandler,
};
