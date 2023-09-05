/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { LIST_INDEX } from '@kbn/securitysolution-list-constants';

import { createListIndexResponse } from '../../../common/api';
import type { ListsPluginRouter } from '../../types';
import { buildSiemResponse } from '../utils';
import { getListClient } from '..';

export const createListIndexRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
      access: 'public',
      options: {
        tags: ['access:lists-all'],
      },
      path: LIST_INDEX,
    })
    .addVersion({ validate: false, version: '2023-10-31' }, async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const lists = await getListClient(context);

        const listDataStreamExists = await lists.getListDataStreamExists();
        const listItemDataStreamExists = await lists.getListItemDataStreamExists();

        const templateListExists = await lists.getListTemplateExists();
        const templateListItemsExists = await lists.getListItemTemplateExists();

        if (!templateListExists || !listDataStreamExists) {
          await lists.setListTemplate();
        }

        if (!templateListItemsExists || !listItemDataStreamExists) {
          await lists.setListItemTemplate();
        }

        if (listDataStreamExists && listItemDataStreamExists) {
          return siemResponse.error({
            body: `data stream: "${lists.getListName()}" and "${lists.getListItemName()}" already exists`,
            statusCode: 409,
          });
        }

        if (!listDataStreamExists) {
          const listIndexExists = await lists.getListIndexExists();
          await (listIndexExists
            ? lists.migrateListIndexToDataStream()
            : lists.createListDataStream());
        }

        if (!listItemDataStreamExists) {
          const listItemIndexExists = await lists.getListItemIndexExists();
          await (listItemIndexExists
            ? lists.migrateListItemIndexToDataStream()
            : lists.createListItemDataStream());
        }

        const [validated, errors] = validate({ acknowledged: true }, createListIndexResponse);
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
    });
};
