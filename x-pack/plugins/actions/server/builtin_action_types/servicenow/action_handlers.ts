/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { zipWith } from 'lodash';
import { CommentResponse } from './lib/types';
import {
  IncidentCreationResponse,
  CommentType,
  CommentsZipped,
  CreateHandlerArguments,
  UpdateHandlerArguments,
  IncidentHandlerArguments,
} from './types';
import { ServiceNow } from './lib';
import {
  appendInformationToIncident,
  appendInformationToComments,
  applyActionTypeToFields,
} from './helpers';

export const createComments = async (
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
}: CreateHandlerArguments): Promise<IncidentCreationResponse> => {
  const mappedParams = appendInformationToIncident(params, 'create');

  const { incidentId, number, pushedDate } = await serviceNow.createIncident({
    ...mappedParams,
  });

  const res: IncidentCreationResponse = { incidentId, number, pushedDate };

  if (comments && Array.isArray(comments) && comments.length > 0) {
    comments = appendInformationToComments(comments, params, 'create');
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
}: UpdateHandlerArguments): Promise<IncidentCreationResponse> => {
  const serviceNowIncident = await serviceNow.getIncident(incidentId);

  const mappedParams = applyActionTypeToFields({
    params,
    mapping,
    incident: serviceNowIncident,
  });

  const { number, pushedDate } = await serviceNow.updateIncident(incidentId, {
    ...mappedParams,
  });

  const res: IncidentCreationResponse = { incidentId, number, pushedDate };

  if (
    comments &&
    Array.isArray(comments) &&
    comments.length > 0 &&
    mapping.get('comments').actionType !== 'nothing'
  ) {
    const commentsToCreate = appendInformationToComments(
      comments.filter(c => !c.updatedAt),
      params,
      'create'
    );
    const commentsToUpdate = appendInformationToComments(
      comments.filter(c => c.updatedAt),
      params,
      'update'
    );
    res.comments = [
      ...(await createComments(serviceNow, incidentId, mapping.get('comments').target, [
        ...commentsToCreate,
        ...commentsToUpdate,
      ])),
    ];
  }

  return { ...res };
};

export const handleIncident = async ({
  incidentId,
  serviceNow,
  params,
  comments,
  mapping,
}: IncidentHandlerArguments): Promise<IncidentCreationResponse> => {
  if (!incidentId) {
    return await handleCreateIncident({ serviceNow, params, comments, mapping });
  } else {
    return await handleUpdateIncident({ incidentId, serviceNow, params, comments, mapping });
  }
};
