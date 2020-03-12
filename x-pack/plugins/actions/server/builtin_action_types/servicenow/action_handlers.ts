/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { zipWith } from 'lodash';
import { Incident, CommentResponse } from './lib/types';
import {
  UpdateParamsType,
  IncidentCreationResponse,
  CommentType,
  CommentsZipped,
  CreateHandlerArguments,
  UpdateHandlerArguments,
  IncidentHandlerArguments,
  FinalMapping,
  ApplyActionTypeToFieldsArgs,
  AppendFieldArgs,
  KeyAny,
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

export const appendField = ({ value, prefix = '', suffix = '' }: AppendFieldArgs) => {
  return `${prefix}${value}${suffix}`;
};

export const applyActionTypeToFields = ({
  params,
  mapping,
  incident,
}: ApplyActionTypeToFieldsArgs) => {
  // Ignore fields that have as actionType = nothing
  params = Object.keys(params)
    .filter((p: string) => mapping.get(p).actionType !== 'nothing')
    .reduce((fields: KeyAny, paramKey: string) => {
      fields[paramKey] = params[paramKey];
      return fields;
    }, {} as KeyAny);

  // Append previous incident's value to fields that have as actionType = append
  return Object.keys(params).reduce((fields: KeyAny, paramKey: string) => {
    const actionType = mapping.get(paramKey).actionType;
    const incidentCurrentFieldValue = incident[paramKey] ?? '';

    if (actionType === 'append') {
      fields[paramKey] = appendField({
        value: params[paramKey],
        suffix: incidentCurrentFieldValue,
      });
    } else {
      fields[paramKey] = params[paramKey];
    }

    return fields;
  }, {} as KeyAny);
};

export const handleCreateIncident = async ({
  serviceNow,
  params,
  comments,
  mapping,
}: CreateHandlerArguments): Promise<IncidentCreationResponse> => {
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
}: UpdateHandlerArguments): Promise<IncidentCreationResponse> => {
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
    const serviceNowIncident = await serviceNow.getIncident(incidentId);
    params = applyActionTypeToFields({ params, mapping, incident: serviceNowIncident });
    return await handleUpdateIncident({ incidentId, serviceNow, params, comments, mapping });
  }
};
