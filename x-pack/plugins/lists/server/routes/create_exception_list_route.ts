/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { EXCEPTION_LIST_URL } from '../../common/constants';
import {
  buildRouteValidation,
  buildSiemResponse,
  transformError,
  validate,
} from '../siem_server_deps';
import {
  CreateExceptionListSchemaDecoded,
  createExceptionListSchema,
  exceptionListSchema,
} from '../../common/schemas';

import { getExceptionListClient } from './utils/get_exception_list_client';

export const createExceptionListRoute = (router: IRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists'],
      },
      path: EXCEPTION_LIST_URL,
      validate: {
        body: buildRouteValidation<
          typeof createExceptionListSchema,
          CreateExceptionListSchemaDecoded
        >(createExceptionListSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { name, _tags, tags, meta, description, list_id: listId, type } = request.body;
        const exceptionLists = getExceptionListClient(context);
        const exceptionList = await exceptionLists.getExceptionList({
          id: undefined,
          listId,
          // TODO: Expose the name space type
          namespaceType: 'single',
        });
        if (exceptionList != null) {
          return siemResponse.error({
            body: `exception list id: "${listId}" already exists`,
            statusCode: 409,
          });
        } else {
          const createdList = await exceptionLists.createExceptionList({
            _tags,
            description,
            listId,
            meta,
            name,
            // TODO: Expose the name space type
            namespaceType: 'single',
            tags,
            type,
          });
          const [validated, errors] = validate(createdList, exceptionListSchema);
          if (errors != null) {
            return siemResponse.error({ body: errors, statusCode: 500 });
          } else {
            return response.ok({ body: validated ?? {} });
          }
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
