/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

import { IRouter } from 'kibana/server';

import { LIST_ITEM_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import { importListItemQuerySchema, importListItemSchema, listSchema } from '../../common/schemas';

import { getListClient } from '.';

export interface HapiReadableStream extends Readable {
  hapi: {
    filename: string;
  };
}

/**
 * Special interface since we are streaming in a file through a reader
 */
export interface ImportListItemHapiFileSchema {
  file: HapiReadableStream;
}

export const importListItemRoute = (router: IRouter): void => {
  router.post(
    {
      options: {
        body: {
          output: 'stream',
        },
        tags: ['access:lists'],
      },
      path: `${LIST_ITEM_URL}/_import`,
      validate: {
        body: buildRouteValidation<typeof importListItemSchema, ImportListItemHapiFileSchema>(
          importListItemSchema
        ),
        query: buildRouteValidation(importListItemQuerySchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { list_id: listId, type } = request.query;
        const lists = getListClient(context);
        if (listId != null) {
          const list = await lists.getList({ id: listId });
          if (list == null) {
            return siemResponse.error({
              body: `list id: "${listId}" does not exist`,
              statusCode: 409,
            });
          }
          await lists.importListItemsToStream({
            listId,
            meta: undefined,
            stream: request.body.file,
            type: list.type,
          });

          const [validated, errors] = validate(list, listSchema);
          if (errors != null) {
            return siemResponse.error({ body: errors, statusCode: 500 });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        } else if (type != null) {
          const { filename } = request.body.file.hapi;
          // TODO: Should we prevent the same file from being uploaded multiple times?
          const list = await lists.createListIfItDoesNotExist({
            description: `File uploaded from file system of ${filename}`,
            id: filename,
            meta: undefined,
            name: filename,
            type,
          });
          await lists.importListItemsToStream({
            listId: list.id,
            meta: undefined,
            stream: request.body.file,
            type: list.type,
          });
          const [validated, errors] = validate(list, listSchema);
          if (errors != null) {
            return siemResponse.error({ body: errors, statusCode: 500 });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        } else {
          return siemResponse.error({
            body: 'Either type or list_id need to be defined in the query',
            statusCode: 400,
          });
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
