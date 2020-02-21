/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDeps } from '.';
import { CASES_API_BASE_URL } from '../../constants';
import { NewActionSchema } from './schema';
import { CaseRequestHandler, NewActionType } from './types';
import { createRequestHandler } from './utils';

const createNewActionHandler: CaseRequestHandler = async (service, context, request, response) => {
  const actionsClient = await context.actions.getActionsClient();
  const { name, actionTypeId, secrets, config } = request.body as NewActionType;

  try {
    const action = await actionsClient.create({ action: { name, actionTypeId, secrets, config } });
    return response.ok({ body: { ...action } });
  } catch (error) {
    throw error;
  }
};

export const createNewAction = ({ caseService, router }: RouteDeps) => {
  router.post(
    {
      path: `${CASES_API_BASE_URL}/configure/action`,
      validate: {
        body: NewActionSchema,
      },
    },
    createRequestHandler(caseService, createNewActionHandler)
  );
};
