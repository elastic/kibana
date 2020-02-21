/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDeps } from '.';
import { CASES_API_BASE_URL } from '../../constants';
import { NewActionSchema } from './schema';
import { CaseRequestHandler } from './types';
import { createRequestHandler } from './utils';

const createNewActionHandler: CaseRequestHandler = async (service, context, request, response) => {
  return response.ok({});
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
