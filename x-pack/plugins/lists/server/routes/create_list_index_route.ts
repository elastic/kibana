/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { acknowledgeSchema } from '@kbn/securitysolution-io-ts-list-types';
import { LIST_INDEX } from '@kbn/securitysolution-list-constants';

import { ListClient } from '../services/lists/list_client';
import type { ListsPluginRouter } from '../types';

import { buildSiemResponse } from './utils';

import { getListClient } from '.';

const removeLegacyTemplatesIfExist = async (lists: ListClient): Promise<void> => {
  const legacyTemplateExists = await lists.getLegacyListTemplateExists();
  const legacyTemplateListItemsExists = await lists.getLegacyListItemTemplateExists();
  try {
    // Check if the old legacy lists and items template exists and remove it
    if (legacyTemplateExists) {
      await lists.deleteLegacyListTemplate();
    }
    if (legacyTemplateListItemsExists) {
      await lists.deleteLegacyListItemTemplate();
    }
  } catch (err) {
    if (err.statusCode !== 404) {
      throw err;
    }
  }
};

export const createListIndexRoute = (router: ListsPluginRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists-all'],
      },
      path: LIST_INDEX,
      validate: false,
    },
    async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const lists = await getListClient(context);

        const listDataStreamExists = await lists.getListDataStreamExists();
        const listItemDataStreamExists = await lists.getListItemDataStreamExists();
        // const policyExists = await lists.getListPolicyExists();
        // const policyListItemExists = await lists.getListItemPolicyExists();

        // if (!policyExists) {
        //   await lists.setListPolicy();
        // }
        // if (!policyListItemExists) {
        //   await lists.setListItemPolicy();
        // }

        const templateListExists = await lists.getListTemplateExists();
        const templateListItemsExists = await lists.getListItemTemplateExists();

        if (!templateListExists || !listDataStreamExists) {
          await lists.setListTemplate();
        }

        if (!templateListItemsExists || !listItemDataStreamExists) {
          await lists.setListItemTemplate();
        }

        await removeLegacyTemplatesIfExist(lists);

        if (listDataStreamExists && listItemDataStreamExists) {
          return siemResponse.error({
            body: `data stream: "${lists.getListIndex()}" and "${lists.getListItemIndex()}" already exists`,
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

        const [validated, errors] = validate({ acknowledged: true }, acknowledgeSchema);
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
