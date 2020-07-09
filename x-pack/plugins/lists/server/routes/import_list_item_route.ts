/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';

import { LIST_ITEM_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import { importListItemQuerySchema, listSchema } from '../../common/schemas';
import { ConfigType } from '../config';

import { createStreamFromBuffer } from './utils/create_stream_from_buffer';

import { getListClient } from '.';

export const importListItemRoute = (router: IRouter, config: ConfigType): void => {
  router.post(
    {
      options: {
        body: {
          accepts: ['multipart/form-data'],
          maxBytes: config.maxImportPayloadBytes,
          parse: false,
        },
        tags: ['access:lists'],
      },
      path: `${LIST_ITEM_URL}/_import`,
      validate: {
        body: schema.buffer(),
        query: buildRouteValidation(importListItemQuerySchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const stream = createStreamFromBuffer(request.body);
        const { deserializer, list_id: listId, serializer, type } = request.query;
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
            deserializer: list.deserializer,
            listId,
            meta: undefined,
            serializer: list.serializer,
            stream,
            type: list.type,
          });

          const [validated, errors] = validate(list, listSchema);
          if (errors != null) {
            return siemResponse.error({ body: errors, statusCode: 500 });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        } else if (type != null) {
          const importedList = await lists.importListItemsToStream({
            deserializer,
            listId: undefined,
            meta: undefined,
            serializer,
            stream,
            type,
          });
          if (importedList == null) {
            return siemResponse.error({
              body: 'Unable to parse a valid fileName during import',
              statusCode: 400,
            });
          }
          const [validated, errors] = validate(importedList, listSchema);
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
