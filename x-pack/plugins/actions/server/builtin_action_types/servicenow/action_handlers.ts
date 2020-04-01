/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { zipWith } from 'lodash';
import { CommentResponse } from './lib/types';
import {
  HandlerResponse,
  Comment,
  SimpleComment,
  CreateHandlerArguments,
  UpdateHandlerArguments,
  IncidentHandlerArguments,
} from './types';
import { ServiceNow } from './lib';
import { transformFields, prepareFieldsForTransformation, transformComments } from './helpers';

export const createComments = async (
  serviceNow: ServiceNow,
  incidentId: string,
  key: string,
  comments: Comment[]
): Promise<SimpleComment[]> => {
  const createdComments = await serviceNow.batchCreateComments(incidentId, comments, key);

  return zipWith(comments, createdComments, (a: Comment, b: CommentResponse) => ({
    commentId: a.commentId,
    pushedDate: b.pushedDate,
  }));
};

export const handleCreateIncident = async ({
  serviceNow,
  params,
  comments,
  mapping,
}: CreateHandlerArguments): Promise<HandlerResponse> => {
  const fields = prepareFieldsForTransformation({
    params,
    mapping,
  });

  const incident = transformFields({
    params,
    fields,
  });

  const createdIncident = await serviceNow.createIncident({
    ...incident,
  });

  const res: HandlerResponse = { ...createdIncident };

  if (
    comments &&
    Array.isArray(comments) &&
    comments.length > 0 &&
    mapping.get('comments').actionType !== 'nothing'
  ) {
    comments = transformComments(comments, params, ['informationAdded']);
    res.comments = [
      ...(await createComments(
        serviceNow,
        res.incidentId,
        mapping.get('comments').target,
        comments
      )),
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
}: UpdateHandlerArguments): Promise<HandlerResponse> => {
  const currentIncident = await serviceNow.getIncident(incidentId);
  const fields = prepareFieldsForTransformation({
    params,
    mapping,
    defaultPipes: ['informationUpdated'],
  });

  const incident = transformFields({
    params,
    fields,
    currentIncident,
  });

  const updatedIncident = await serviceNow.updateIncident(incidentId, {
    ...incident,
  });

  const res: HandlerResponse = { ...updatedIncident };

  if (
    comments &&
    Array.isArray(comments) &&
    comments.length > 0 &&
    mapping.get('comments').actionType !== 'nothing'
  ) {
    comments = transformComments(comments, params, ['informationAdded']);
    res.comments = [
      ...(await createComments(serviceNow, incidentId, mapping.get('comments').target, comments)),
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
}: IncidentHandlerArguments): Promise<HandlerResponse> => {
  if (!incidentId) {
    return await handleCreateIncident({ serviceNow, params, comments, mapping });
  } else {
    return await handleUpdateIncident({ incidentId, serviceNow, params, comments, mapping });
  }
};
