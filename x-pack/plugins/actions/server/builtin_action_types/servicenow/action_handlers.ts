/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { zipWith } from 'lodash';
import { Incident, CommentResponse } from './lib/types';
import {
  ActionHandlerArguments,
  UpdateParamsType,
  UpdateActionHandlerArguments,
  IncidentCreationResponse,
  CommentType,
  CommentsZipped,
} from './types';
import { ServiceNow } from './lib';

const createComments = async (
  serviceNow: ServiceNow,
  incidentId: string,
  key: string,
  comments: CommentType[]
): Promise<CommentsZipped[]> => {
  const createdComments = await serviceNow.batchCreateComments(incidentId, comments, key);

  return zipWith(comments, createdComments, (a: CommentType, b: CommentResponse) => ({
    commentId: a.commentId,
    pushedDate: b.pushedDate,
  }));
};

export const handleCreateIncident = async ({
  serviceNow,
  params,
  comments,
  mapping,
}: ActionHandlerArguments): Promise<IncidentCreationResponse> => {
  const paramsAsIncident = params as Incident;

  const { incidentId, number, pushedDate } = await serviceNow.createIncident({
    ...paramsAsIncident,
  });

  const res: IncidentCreationResponse = { incidentId, number, pushedDate };

  if (comments && Array.isArray(comments) && comments.length > 0) {
    res.comments = [
      ...(await createComments(serviceNow, incidentId, mapping.get('comments').target, comments)),
    ];
  }

  return { ...res };
};

export const handleUpdateIncident = async ({
  incidentId,
  serviceNow,
  params,
  comments,
  mapping,
}: UpdateActionHandlerArguments): Promise<IncidentCreationResponse> => {
  const paramsAsIncident = params as UpdateParamsType;

  const { number, pushedDate } = await serviceNow.updateIncident(incidentId, {
    ...paramsAsIncident,
  });

  const res: IncidentCreationResponse = { incidentId, number, pushedDate };

  if (comments && Array.isArray(comments) && comments.length > 0) {
    res.comments = [
      ...(await createComments(serviceNow, incidentId, mapping.get('comments').target, comments)),
    ];
  }

  return { ...res };
};
