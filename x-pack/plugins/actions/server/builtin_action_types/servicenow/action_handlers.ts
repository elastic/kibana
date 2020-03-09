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

  if (comments && Array.isArray(comments) && comments.length > 0) {
    const commentsToCreate = comments.filter(c => !c.incidentCommentId);
    const commentsToUpdate = comments.filter(c => c.incidentCommentId);

    let createRes: CommentsZipped[] = [];
    let updateRes: CommentsZipped[] = [];

    if (commentsToCreate.length > 0) {
      const commentCreationResponse = await serviceNow.batchCreateComments(
        incidentId,
        commentsToCreate,
        mapping.get('comments').target
      );

      createRes = zipWith(
        commentsToCreate,
        commentCreationResponse,
        (a: CommentType, b: CommentResponse) => ({
          commentId: a.commentId,
          incidentCommentId: b.commentId,
        })
      );
    }

    if (commentsToUpdate.length > 0) {
      const commentUpdateResponse = await serviceNow.batchUpdateComments(commentsToUpdate);

      updateRes = zipWith(
        commentsToUpdate,
        commentUpdateResponse,
        (a: CommentType, b: CommentResponse) => ({
          commentId: a.commentId,
          incidentCommentId: b.commentId,
        })
      );
    }

    res.comments = [...createRes, ...updateRes];
  }

  return { ...res };
};
