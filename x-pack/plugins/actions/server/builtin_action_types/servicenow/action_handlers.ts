/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { zipWith } from 'lodash';
import { Incident, CommentResponse } from '../lib/servicenow/types';
import {
  ActionHandlerArguments,
  UpdateParamsType,
  UpdateActionHandlerArguments,
  IncidentCreationResponse,
  CommentType,
  CommentsZipped,
} from './types';

export const handleCreateIncident = async ({
  serviceNow,
  params,
  comments,
  mapping,
}: ActionHandlerArguments): Promise<IncidentCreationResponse> => {
  const paramsAsIncident = params as Incident;

  const { incidentId, number } = await serviceNow.createIncident({
    ...paramsAsIncident,
  });

  const res: IncidentCreationResponse = { incidentId, number };

  // Should return comment ID
  if (comments && Array.isArray(comments) && comments.length > 0) {
    const commentResponse = await serviceNow.batchCreateComments(
      incidentId,
      comments,
      mapping.get('comments').target
    );

    res.comments = zipWith(comments, commentResponse, (a: CommentType, b: CommentResponse) => ({
      commentId: a.commentId,
      incidentCommentId: b.commentId,
    }));
  }

  return { ...res };
};

export const handleUpdateIncident = async ({
  incidentId,
  serviceNow,
  params,
  comments,
  mapping,
}: UpdateActionHandlerArguments) => {
  const paramsAsIncident = params as UpdateParamsType;

  const { number } = await serviceNow.updateIncident(incidentId, {
    ...paramsAsIncident,
  });

  const res: IncidentCreationResponse = { incidentId, number };

  // Should return comment ID
  if (comments && Array.isArray(comments) && comments.length > 0) {
    const commentsToUpdate = comments.filter(c => c.incidentCommentId);
    const commentsToCreate = comments.filter(c => !c.incidentCommentId);

    const commentCreationResponse = await serviceNow.batchCreateComments(
      incidentId,
      commentsToCreate,
      mapping.get('comments').target
    );

    const commentUpdateResponse = await serviceNow.batchUpdateComments(commentsToUpdate);

    const updateRes: CommentsZipped[] = zipWith(
      commentsToCreate,
      commentCreationResponse,
      (a: CommentType, b: CommentResponse) => ({
        commentId: a.commentId,
        incidentCommentId: b.commentId,
      })
    );

    const createRes: CommentsZipped[] = zipWith(
      commentsToUpdate,
      commentUpdateResponse,
      (a: CommentType, b: CommentResponse) => ({
        commentId: a.commentId,
        incidentCommentId: b.commentId,
      })
    );

    res.comments = [...updateRes, ...createRes];
  }

  return { ...res };
};
