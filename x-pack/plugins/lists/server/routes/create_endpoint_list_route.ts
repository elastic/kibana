/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { ENDPOINT_LIST_URL } from '../../common/constants';
import { buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import { createEndpointListSchema } from '../../common/schemas';

import { getExceptionListClient } from './utils/get_exception_list_client';

/**
 * This creates the endpoint list if it does not exist. If it does exist,
 * this will conflict but continue. This is intended to be as fast as possible so it tries
 * each and every time it is called to create the endpoint_list and just ignores any
 * conflict so at worse case only one round trip happens per API call. If any error other than conflict
 * happens this will return that error. If the list already exists this will return an empty
 * object.
 * @param router The router to use.
 */
export const createEndpointListRoute = (router: IRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists'],
      },
      path: ENDPOINT_LIST_URL,
      validate: false,
    },
    async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const exceptionLists = getExceptionListClient(context);
        const createdList = await exceptionLists.createEndpointList();
        // We always return ok on a create  endpoint list route but with an empty body as
        // an additional fetch of the full list would be slower and the UI has everything hard coded
        // within it to get the list if it needs details about it. Our goal is to be as fast as possible
        // and block the least amount of time with this route since it could end up in various parts of the
        // stack at some point such as repeatedly being called by endpoint agents.
        const body = createdList ?? {};
        const [validated, errors] = validate(body, createEndpointListSchema);
        if (errors != null) {
          return siemResponse.error({ body: errors, statusCode: 500 });
        } else {
          return response.ok({ body: validated ?? {} });
        }
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
