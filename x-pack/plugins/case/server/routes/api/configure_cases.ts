/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { RouteDeps } from '.';
import { CASES_API_BASE_URL, SUPPORTED_ACTIONS } from '../../constants';
import { NewActionSchema, FindActionsSchema, CheckActionHealthSchema } from './schema';
import { CaseRequestHandler, NewActionType, CheckActionHealthType } from './types';
import { createRequestHandler } from './utils';
import { HttpRequestError } from './errors';

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

const getFilter = (actions: string[]): string => {
  if (!actions || actions.length === 0) {
    return '';
  }

  const operator = 'OR';

  const concatenatedActionsWithOperator = actions.reduce(
    (prev, curr) => `${prev} ${operator} ${curr}`
  );

  return `action.attributes.actionTypeId: (${concatenatedActionsWithOperator})`;
};

const isInstanceAlive = (statusCode: number, contentType: string) => {
  if (statusCode === 200 && contentType.includes('application/json')) {
    return true;
  }

  return false;
};

const findActionsHandler: CaseRequestHandler = async (service, context, request, response) => {
  const actionsClient = await context.actions.getActionsClient();

  try {
    const results = await actionsClient.find({ options: { filter: getFilter(SUPPORTED_ACTIONS) } });
    return response.ok({ body: { ...results } });
  } catch (error) {
    throw error;
  }
};

const checkActionHealthHandler: CaseRequestHandler = async (
  service,
  context,
  request,
  response
) => {
  try {
    const { apiUrl, username, password } = request.body as CheckActionHealthType;
    const res = await axios.get(apiUrl, {
      auth: { username, password },
      validateStatus: status => status >= 200 && status < 500,
    });

    const isAlive = isInstanceAlive(res.status, res.headers['content-type']);

    if (!isAlive) {
      throw new HttpRequestError(400, 'Bad request');
    }

    return response.ok({ body: {} });
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

export const findActions = ({ caseService, router }: RouteDeps) => {
  router.get(
    {
      path: `${CASES_API_BASE_URL}/configure/action/_find`,
      validate: {
        query: FindActionsSchema,
      },
    },
    createRequestHandler(caseService, findActionsHandler)
  );
};

export const checkActionHealth = ({ caseService, router }: RouteDeps) => {
  router.post(
    {
      path: `${CASES_API_BASE_URL}/configure/action/health`,
      validate: {
        body: CheckActionHealthSchema,
      },
    },
    createRequestHandler(caseService, checkActionHealthHandler)
  );
};
