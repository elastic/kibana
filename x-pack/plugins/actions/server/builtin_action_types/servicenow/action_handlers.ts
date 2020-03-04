/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Incident } from '../lib/servicenow/types';
import { ActionHandlerArguments, UpdateParamsType, UpdateActionHandlerArguments } from './types';

export const handleCreateIncident = async ({
  serviceNow,
  params,
  comments,
  mapping,
}: ActionHandlerArguments) => {
  const paramsAsIncident = params as Incident;

  const userId = await serviceNow.getUserID();
  const { id, number } = await serviceNow.createIncident({
    ...paramsAsIncident,
    caller_id: userId,
  });

  if (comments && Array.isArray(comments) && comments.length > 0) {
    await serviceNow.batchAddComments(
      id,
      comments.map(c => c.comment),
      mapping.get('comments').target
    );
  }

  return { id, number };
};

export const handleUpdateIncident = async ({
  incidentId,
  serviceNow,
  params,
  comments,
  mapping,
}: UpdateActionHandlerArguments) => {
  const paramsAsIncident = params as UpdateParamsType;

  await serviceNow.updateIncident(incidentId, { ...paramsAsIncident });

  if (comments && Array.isArray(comments) && comments.length > 0) {
    await serviceNow.batchAddComments(
      incidentId,
      comments.map(c => c.comment),
      mapping.get('comments').target
    );
  }
};
