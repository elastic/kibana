/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import { LIST_INDEX } from '../../common/constants';
import { acknowledgeSchema } from '../../common/schemas';

import { getListClient } from '.';

export const createListIndexRoute = (router: IRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists'],
      },
      path: LIST_INDEX,
      validate: false,
    },
    async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const lists = getListClient(context);
        const listIndexExists = await lists.getListIndexExists();
        const listItemIndexExists = await lists.getListItemIndexExists();

        if (listIndexExists && listItemIndexExists) {
          return siemResponse.error({
            body: `index: "${lists.getListIndex()}" and "${lists.getListItemIndex()}" already exists`,
            statusCode: 409,
          });
        } else {
          const policyExists = await lists.getListPolicyExists();
          const policyListItemExists = await lists.getListItemPolicyExists();

          if (!policyExists) {
            await lists.setListPolicy();
          }
          if (!policyListItemExists) {
            await lists.setListItemPolicy();
          }

          const templateExists = await lists.getListTemplateExists();
          const templateListItemsExists = await lists.getListItemTemplateExists();

          if (!templateExists) {
            await lists.setListTemplate();
          }

          if (!templateListItemsExists) {
            await lists.setListItemTemplate();
          }

          if (!listIndexExists) {
            await lists.createListBootStrapIndex();
          }
          if (!listItemIndexExists) {
            await lists.createListItemBootStrapIndex();
          }

          const [validated, errors] = validate({ acknowledged: true }, acknowledgeSchema);
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
