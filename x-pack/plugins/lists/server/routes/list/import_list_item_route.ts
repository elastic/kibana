/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extname } from 'path';

import { schema } from '@kbn/config-schema';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../../types';
import { ConfigType } from '../../config';
import { importListItemRequestQuery, importListItemResponse } from '../../../common/api';
import { buildRouteValidation, buildSiemResponse } from '../utils';
import { createStreamFromBuffer } from '../utils/create_stream_from_buffer';
import { getListClient } from '..';

const validFileExtensions = ['.csv', '.txt'];

export const importListItemRoute = (router: ListsPluginRouter, config: ConfigType): void => {
  router.versioned
    .post({
      access: 'public',
      options: {
        body: {
          accepts: ['multipart/form-data'],
          maxBytes: config.maxImportPayloadBytes,
          parse: false,
        },
        tags: ['access:lists-all'],
        timeout: {
          payload: config.importTimeout.asMilliseconds(),
        },
      },
      path: `${LIST_ITEM_URL}/_import`,
    })
    .addVersion(
      {
        validate: {
          request: {
            body: schema.buffer(),
            query: buildRouteValidation(importListItemRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { deserializer, list_id: listId, serializer, type, refresh } = request.query;
          const lists = await getListClient(context);

          const filename = await lists.getImportFilename({
            stream: createStreamFromBuffer(request.body),
          });
          if (!filename) {
            return siemResponse.error({
              body: 'To import a list item, the file name must be specified',
              statusCode: 400,
            });
          }
          const fileExtension = extname(filename).toLowerCase();
          if (!validFileExtensions.includes(fileExtension)) {
            return siemResponse.error({
              body: `Unsupported media type. File must be one of the following types: [${validFileExtensions.join(
                ', '
              )}]`,
              statusCode: 415,
            });
          }

          const stream = createStreamFromBuffer(request.body);
          const listDataExists = await lists.getListDataStreamExists();
          if (!listDataExists) {
            const listIndexExists = await lists.getListIndexExists();
            if (!listIndexExists) {
              return siemResponse.error({
                body: `To import a list item, the data steam must exist first. Data stream "${lists.getListName()}" does not exist`,
                statusCode: 400,
              });
            }
            // otherwise migration is needed
            await lists.migrateListIndexToDataStream();
          }

          const listItemDataExists = await lists.getListItemDataStreamExists();
          if (!listItemDataExists) {
            const listItemIndexExists = await lists.getListItemIndexExists();
            if (!listItemIndexExists) {
              return siemResponse.error({
                body: `To import a list item, the data steam must exist first. Data stream "${lists.getListItemName()}" does not exist`,
                statusCode: 400,
              });
            }
            // otherwise migration is needed
            await lists.migrateListItemIndexToDataStream();
          }

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
              refresh,
              serializer: list.serializer,
              stream,
              type: list.type,
              version: 1,
            });

            const [validated, errors] = validate(list, importListItemResponse);
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
              refresh,
              serializer,
              stream,
              type,
              version: 1,
            });
            if (importedList == null) {
              return siemResponse.error({
                body: 'Unable to parse a valid fileName during import',
                statusCode: 400,
              });
            }
            const [validated, errors] = validate(importedList, importListItemResponse);
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
